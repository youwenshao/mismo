// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDecidendiEscrow {
    enum Milestone {
        CREATED,
        DEPOSIT_LOCKED,
        BUILD_COMPLETE,
        DELIVERED,
        ACCEPTED,
        FINALIZED
    }

    struct CommissionData {
        bytes32 commissionId;
        address payer;
        address payee;
        uint256 depositAmount;
        uint256 finalAmount;
        uint256 totalAmount;
        Milestone currentMilestone;
        uint256 createdAt;
        uint256 deadlineAt;
        bool disputed;
        bool voided;
        bytes32 prdHash;
    }

    event DepositLocked(bytes32 indexed commissionId, address payer, uint256 amount, uint256 deadline);
    event MilestoneCompleted(bytes32 indexed commissionId, Milestone milestone, uint256 timestamp);
    event ClientAccepted(bytes32 indexed commissionId, uint256 timestamp);
    event FinalLocked(bytes32 indexed commissionId, uint256 amount);
    event FinalReleased(bytes32 indexed commissionId, uint256 amount);
    event DepositReleased(bytes32 indexed commissionId, uint256 amount);
    event DisputeRaised(bytes32 indexed commissionId, address by, string reason);
    event DisputeResolved(bytes32 indexed commissionId, uint256 refundAmount, uint256 payeeAmount);
    event ContractVoided(bytes32 indexed commissionId, uint256 refundAmount);
    event Reclaimed(bytes32 indexed commissionId, uint256 amount);
    event DeadlineExtended(bytes32 indexed commissionId, uint256 oldDeadline, uint256 newDeadline);

    function lockDeposit(
        bytes32 commissionId,
        address payer,
        uint256 depositAmount,
        uint256 finalAmount,
        uint256 deadlineAt,
        bytes32 prdHash
    ) external;

    function completeMilestone(bytes32 commissionId, Milestone milestone) external;
    function clientAccept(bytes32 commissionId) external;
    function lockFinal(bytes32 commissionId) external;
    function releaseFinal(bytes32 commissionId) external;
    function dispute(bytes32 commissionId, string calldata reason) external;
    function resolveDispute(bytes32 commissionId, uint256 refundBps) external;
    function voidContract(bytes32 commissionId) external;
    function reclaimExpired(bytes32 commissionId) external;
    function extendDeadline(bytes32 commissionId, uint256 newDeadline) external;
    function getCommission(bytes32 commissionId) external view returns (CommissionData memory);
}
