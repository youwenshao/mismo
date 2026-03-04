// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IDecidendiEscrow} from "./interfaces/IDecidendiEscrow.sol";
import {MilestoneLib} from "./libraries/MilestoneLib.sol";

/**
 * @title DecidendiEscrow
 * @notice Milestone-based escrow for Mismo commissions on Base L2.
 *         Funds are held in USDC and released when milestones are met.
 *         Non-upgradeable by design -- old escrows always honor original terms.
 */
contract DecidendiEscrow is IDecidendiEscrow, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public operator;
    address public arbiter;
    address public treasury;

    uint256 public constant GRACE_PERIOD = 3 days;
    uint256 public constant RECLAIM_BUFFER = 30 days;
    uint256 public constant BPS_BASE = 10_000;

    mapping(bytes32 => CommissionData) private commissions;
    mapping(bytes32 => uint256) public acceptedAt;
    mapping(bytes32 => bool) public finalLocked;

    modifier onlyOperator() {
        require(msg.sender == operator, "Decidendi: caller is not operator");
        _;
    }

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Decidendi: caller is not arbiter");
        _;
    }

    modifier onlyPayerOrOperator(bytes32 commissionId) {
        CommissionData storage c = commissions[commissionId];
        require(
            msg.sender == c.payer || msg.sender == operator,
            "Decidendi: caller is not payer or operator"
        );
        _;
    }

    modifier notVoidedOrDisputed(bytes32 commissionId) {
        CommissionData storage c = commissions[commissionId];
        require(!c.voided, "Decidendi: commission is voided");
        require(!c.disputed, "Decidendi: commission is disputed");
        _;
    }

    constructor(address _usdc, address _operator, address _arbiter, address _treasury) {
        require(_usdc != address(0), "Decidendi: zero USDC address");
        require(_operator != address(0), "Decidendi: zero operator address");
        require(_arbiter != address(0), "Decidendi: zero arbiter address");
        require(_treasury != address(0), "Decidendi: zero treasury address");

        usdc = IERC20(_usdc);
        operator = _operator;
        arbiter = _arbiter;
        treasury = _treasury;
    }

    // ─── Core Lifecycle ───────────────────────────────────────────────

    function lockDeposit(
        bytes32 commissionId,
        address payer,
        uint256 depositAmount,
        uint256 finalAmount,
        uint256 deadlineAt,
        bytes32 prdHash
    ) external override onlyOperator whenNotPaused nonReentrant {
        require(commissions[commissionId].createdAt == 0, "Decidendi: commission already exists");
        require(payer != address(0), "Decidendi: zero payer address");
        require(depositAmount > 0, "Decidendi: zero deposit");
        require(deadlineAt > block.timestamp, "Decidendi: deadline in the past");

        commissions[commissionId] = CommissionData({
            commissionId: commissionId,
            payer: payer,
            payee: treasury,
            depositAmount: depositAmount,
            finalAmount: finalAmount,
            totalAmount: depositAmount + finalAmount,
            currentMilestone: Milestone.DEPOSIT_LOCKED,
            createdAt: block.timestamp,
            deadlineAt: deadlineAt,
            disputed: false,
            voided: false,
            prdHash: prdHash
        });

        usdc.safeTransferFrom(msg.sender, address(this), depositAmount);

        emit DepositLocked(commissionId, payer, depositAmount, deadlineAt);
        emit MilestoneCompleted(commissionId, Milestone.DEPOSIT_LOCKED, block.timestamp);
    }

    function completeMilestone(
        bytes32 commissionId,
        Milestone milestone
    ) external override onlyOperator whenNotPaused notVoidedOrDisputed(commissionId) {
        CommissionData storage c = commissions[commissionId];
        require(c.createdAt != 0, "Decidendi: commission does not exist");
        require(
            MilestoneLib.validateTransition(c.currentMilestone, milestone),
            "Decidendi: invalid milestone transition"
        );

        c.currentMilestone = milestone;
        emit MilestoneCompleted(commissionId, milestone, block.timestamp);
    }

    function clientAccept(
        bytes32 commissionId
    )
        external
        override
        onlyPayerOrOperator(commissionId)
        whenNotPaused
        notVoidedOrDisputed(commissionId)
        nonReentrant
    {
        CommissionData storage c = commissions[commissionId];
        require(c.createdAt != 0, "Decidendi: commission does not exist");
        require(
            c.currentMilestone == Milestone.DELIVERED,
            "Decidendi: must be DELIVERED to accept"
        );

        c.currentMilestone = Milestone.ACCEPTED;
        acceptedAt[commissionId] = block.timestamp;

        usdc.safeTransfer(c.payee, c.depositAmount);

        emit ClientAccepted(commissionId, block.timestamp);
        emit DepositReleased(commissionId, c.depositAmount);
        emit MilestoneCompleted(commissionId, Milestone.ACCEPTED, block.timestamp);
    }

    function lockFinal(
        bytes32 commissionId
    ) external override onlyOperator whenNotPaused notVoidedOrDisputed(commissionId) nonReentrant {
        CommissionData storage c = commissions[commissionId];
        require(c.createdAt != 0, "Decidendi: commission does not exist");
        require(c.currentMilestone == Milestone.ACCEPTED, "Decidendi: must be ACCEPTED");
        require(!finalLocked[commissionId], "Decidendi: final already locked");
        require(c.finalAmount > 0, "Decidendi: no final amount");

        finalLocked[commissionId] = true;
        usdc.safeTransferFrom(msg.sender, address(this), c.finalAmount);

        emit FinalLocked(commissionId, c.finalAmount);
    }

    function releaseFinal(
        bytes32 commissionId
    ) external override onlyOperator whenNotPaused notVoidedOrDisputed(commissionId) nonReentrant {
        CommissionData storage c = commissions[commissionId];
        require(c.createdAt != 0, "Decidendi: commission does not exist");
        require(c.currentMilestone == Milestone.ACCEPTED, "Decidendi: must be ACCEPTED");
        require(finalLocked[commissionId], "Decidendi: final not locked");
        require(
            block.timestamp >= acceptedAt[commissionId] + GRACE_PERIOD,
            "Decidendi: grace period not elapsed"
        );

        c.currentMilestone = Milestone.FINALIZED;
        usdc.safeTransfer(c.payee, c.finalAmount);

        emit FinalReleased(commissionId, c.finalAmount);
        emit MilestoneCompleted(commissionId, Milestone.FINALIZED, block.timestamp);
    }

    // ─── Dispute Resolution ───────────────────────────────────────────

    function dispute(
        bytes32 commissionId,
        string calldata reason
    ) external override onlyPayerOrOperator(commissionId) whenNotPaused {
        CommissionData storage c = commissions[commissionId];
        require(c.createdAt != 0, "Decidendi: commission does not exist");
        require(!c.voided, "Decidendi: commission is voided");
        require(!c.disputed, "Decidendi: already disputed");
        require(
            c.currentMilestone != Milestone.FINALIZED,
            "Decidendi: cannot dispute finalized commission"
        );

        c.disputed = true;
        emit DisputeRaised(commissionId, msg.sender, reason);
    }

    function resolveDispute(
        bytes32 commissionId,
        uint256 refundBps
    ) external override onlyArbiter nonReentrant {
        CommissionData storage c = commissions[commissionId];
        require(c.createdAt != 0, "Decidendi: commission does not exist");
        require(c.disputed, "Decidendi: not disputed");
        require(refundBps <= BPS_BASE, "Decidendi: refundBps exceeds 100%");

        c.disputed = false;
        c.voided = true;

        uint256 escrowBalance = c.depositAmount + (finalLocked[commissionId] ? c.finalAmount : 0);

        uint256 refundAmount = (escrowBalance * refundBps) / BPS_BASE;
        uint256 payeeAmount = escrowBalance - refundAmount;

        if (refundAmount > 0) {
            usdc.safeTransfer(c.payer, refundAmount);
        }
        if (payeeAmount > 0) {
            usdc.safeTransfer(c.payee, payeeAmount);
        }

        emit DisputeResolved(commissionId, refundAmount, payeeAmount);
    }

    // ─── Safety Valves ────────────────────────────────────────────────

    function voidContract(
        bytes32 commissionId
    ) external override onlyPayerOrOperator(commissionId) nonReentrant {
        CommissionData storage c = commissions[commissionId];
        require(c.createdAt != 0, "Decidendi: commission does not exist");
        require(!c.voided, "Decidendi: already voided");
        require(
            c.currentMilestone != Milestone.FINALIZED,
            "Decidendi: cannot void finalized commission"
        );
        require(
            block.timestamp > c.deadlineAt,
            "Decidendi: deadline not yet exceeded"
        );

        c.voided = true;

        uint256 refund = c.depositAmount;
        if (c.currentMilestone == Milestone.ACCEPTED && finalLocked[commissionId]) {
            refund += c.finalAmount;
        }

        if (refund > 0) {
            usdc.safeTransfer(c.payer, refund);
        }

        emit ContractVoided(commissionId, refund);
    }

    function reclaimExpired(bytes32 commissionId) external override nonReentrant {
        CommissionData storage c = commissions[commissionId];
        require(c.createdAt != 0, "Decidendi: commission does not exist");
        require(!c.voided, "Decidendi: already voided");
        require(
            c.currentMilestone != Milestone.FINALIZED,
            "Decidendi: cannot reclaim finalized commission"
        );
        require(
            block.timestamp > c.deadlineAt + RECLAIM_BUFFER,
            "Decidendi: reclaim period not reached"
        );

        c.voided = true;

        uint256 refund = c.depositAmount;
        if (finalLocked[commissionId]) {
            refund += c.finalAmount;
        }

        if (refund > 0) {
            usdc.safeTransfer(c.payer, refund);
        }

        emit Reclaimed(commissionId, refund);
    }

    function extendDeadline(
        bytes32 commissionId,
        uint256 newDeadline
    ) external override onlyOperator notVoidedOrDisputed(commissionId) {
        CommissionData storage c = commissions[commissionId];
        require(c.createdAt != 0, "Decidendi: commission does not exist");
        require(newDeadline > c.deadlineAt, "Decidendi: new deadline must be later");
        require(
            c.currentMilestone != Milestone.FINALIZED,
            "Decidendi: cannot extend finalized commission"
        );

        uint256 oldDeadline = c.deadlineAt;
        c.deadlineAt = newDeadline;
        emit DeadlineExtended(commissionId, oldDeadline, newDeadline);
    }

    // ─── Admin ────────────────────────────────────────────────────────

    function emergencyPause() external onlyArbiter {
        _pause();
    }

    function unpause() external onlyArbiter {
        _unpause();
    }

    function setOperator(address _operator) external onlyArbiter {
        require(_operator != address(0), "Decidendi: zero address");
        operator = _operator;
    }

    // ─── Views ────────────────────────────────────────────────────────

    function getCommission(
        bytes32 commissionId
    ) external view override returns (CommissionData memory) {
        require(commissions[commissionId].createdAt != 0, "Decidendi: commission does not exist");
        return commissions[commissionId];
    }
}
