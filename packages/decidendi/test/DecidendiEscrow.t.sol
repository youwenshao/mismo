// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {DecidendiEscrow} from "../contracts/DecidendiEscrow.sol";
import {IDecidendiEscrow} from "../contracts/interfaces/IDecidendiEscrow.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract DecidendiEscrowTest is Test {
    DecidendiEscrow public escrow;
    MockUSDC public usdc;

    address public operator = address(0xA1);
    address public arbiter = address(0xA2);
    address public treasury = address(0xA3);
    address public payer = address(0xB1);

    bytes32 public commissionId = keccak256("commission-001");
    bytes32 public prdHash = keccak256("prd-json-contents");

    uint256 public constant DEPOSIT = 1_000e6; // 1000 USDC
    uint256 public constant FINAL_AMOUNT = 1_500e6; // 1500 USDC

    function setUp() public {
        usdc = new MockUSDC();
        escrow = new DecidendiEscrow(address(usdc), operator, arbiter, treasury);

        usdc.mint(operator, 100_000e6);
        usdc.mint(payer, 100_000e6);

        vm.prank(operator);
        usdc.approve(address(escrow), type(uint256).max);

        vm.prank(payer);
        usdc.approve(address(escrow), type(uint256).max);
    }

    // ─── lockDeposit ──────────────────────────────────────────────────

    function test_lockDeposit() public {
        uint256 deadline = block.timestamp + 30 days;

        vm.prank(operator);
        escrow.lockDeposit(commissionId, payer, DEPOSIT, FINAL_AMOUNT, deadline, prdHash);

        IDecidendiEscrow.CommissionData memory c = escrow.getCommission(commissionId);
        assertEq(c.payer, payer);
        assertEq(c.payee, treasury);
        assertEq(c.depositAmount, DEPOSIT);
        assertEq(c.finalAmount, FINAL_AMOUNT);
        assertEq(c.totalAmount, DEPOSIT + FINAL_AMOUNT);
        assertEq(uint8(c.currentMilestone), uint8(IDecidendiEscrow.Milestone.DEPOSIT_LOCKED));
        assertEq(c.deadlineAt, deadline);
        assertEq(c.prdHash, prdHash);
        assertFalse(c.disputed);
        assertFalse(c.voided);

        assertEq(usdc.balanceOf(address(escrow)), DEPOSIT);
    }

    function test_lockDeposit_revert_nonOperator() public {
        vm.prank(payer);
        vm.expectRevert("Decidendi: caller is not operator");
        escrow.lockDeposit(commissionId, payer, DEPOSIT, FINAL_AMOUNT, block.timestamp + 1 days, prdHash);
    }

    function test_lockDeposit_revert_duplicate() public {
        vm.startPrank(operator);
        escrow.lockDeposit(commissionId, payer, DEPOSIT, FINAL_AMOUNT, block.timestamp + 1 days, prdHash);
        vm.expectRevert("Decidendi: commission already exists");
        escrow.lockDeposit(commissionId, payer, DEPOSIT, FINAL_AMOUNT, block.timestamp + 1 days, prdHash);
        vm.stopPrank();
    }

    function test_lockDeposit_revert_pastDeadline() public {
        vm.prank(operator);
        vm.expectRevert("Decidendi: deadline in the past");
        escrow.lockDeposit(commissionId, payer, DEPOSIT, FINAL_AMOUNT, block.timestamp - 1, prdHash);
    }

    // ─── completeMilestone ────────────────────────────────────────────

    function test_completeMilestone_buildComplete() public {
        _lockDeposit();

        vm.prank(operator);
        escrow.completeMilestone(commissionId, IDecidendiEscrow.Milestone.BUILD_COMPLETE);

        IDecidendiEscrow.CommissionData memory c = escrow.getCommission(commissionId);
        assertEq(uint8(c.currentMilestone), uint8(IDecidendiEscrow.Milestone.BUILD_COMPLETE));
    }

    function test_completeMilestone_revert_invalidTransition() public {
        _lockDeposit();

        vm.prank(operator);
        vm.expectRevert("Decidendi: invalid milestone transition");
        escrow.completeMilestone(commissionId, IDecidendiEscrow.Milestone.DELIVERED);
    }

    function test_completeMilestone_revert_nonOperator() public {
        _lockDeposit();

        vm.prank(payer);
        vm.expectRevert("Decidendi: caller is not operator");
        escrow.completeMilestone(commissionId, IDecidendiEscrow.Milestone.BUILD_COMPLETE);
    }

    // ─── Full lifecycle ───────────────────────────────────────────────

    function test_fullLifecycle() public {
        _lockDeposit();

        vm.startPrank(operator);
        escrow.completeMilestone(commissionId, IDecidendiEscrow.Milestone.BUILD_COMPLETE);
        escrow.completeMilestone(commissionId, IDecidendiEscrow.Milestone.DELIVERED);
        vm.stopPrank();

        uint256 treasuryBefore = usdc.balanceOf(treasury);

        vm.prank(operator);
        escrow.clientAccept(commissionId);

        assertEq(usdc.balanceOf(treasury), treasuryBefore + DEPOSIT);

        vm.prank(operator);
        escrow.lockFinal(commissionId);

        assertEq(usdc.balanceOf(address(escrow)), FINAL_AMOUNT);

        vm.warp(block.timestamp + 3 days + 1);

        treasuryBefore = usdc.balanceOf(treasury);
        vm.prank(operator);
        escrow.releaseFinal(commissionId);

        assertEq(usdc.balanceOf(treasury), treasuryBefore + FINAL_AMOUNT);

        IDecidendiEscrow.CommissionData memory c = escrow.getCommission(commissionId);
        assertEq(uint8(c.currentMilestone), uint8(IDecidendiEscrow.Milestone.FINALIZED));
    }

    function test_releaseFinal_revert_gracePeriod() public {
        _lockDeposit();

        vm.startPrank(operator);
        escrow.completeMilestone(commissionId, IDecidendiEscrow.Milestone.BUILD_COMPLETE);
        escrow.completeMilestone(commissionId, IDecidendiEscrow.Milestone.DELIVERED);
        vm.stopPrank();

        vm.prank(operator);
        escrow.clientAccept(commissionId);

        vm.prank(operator);
        escrow.lockFinal(commissionId);

        vm.prank(operator);
        vm.expectRevert("Decidendi: grace period not elapsed");
        escrow.releaseFinal(commissionId);
    }

    // ─── clientAccept by payer ────────────────────────────────────────

    function test_clientAccept_byPayer() public {
        _lockDeposit();

        vm.startPrank(operator);
        escrow.completeMilestone(commissionId, IDecidendiEscrow.Milestone.BUILD_COMPLETE);
        escrow.completeMilestone(commissionId, IDecidendiEscrow.Milestone.DELIVERED);
        vm.stopPrank();

        vm.prank(payer);
        escrow.clientAccept(commissionId);

        IDecidendiEscrow.CommissionData memory c = escrow.getCommission(commissionId);
        assertEq(uint8(c.currentMilestone), uint8(IDecidendiEscrow.Milestone.ACCEPTED));
    }

    // ─── Dispute ──────────────────────────────────────────────────────

    function test_dispute_and_resolve() public {
        _lockDeposit();

        vm.startPrank(operator);
        escrow.completeMilestone(commissionId, IDecidendiEscrow.Milestone.BUILD_COMPLETE);
        escrow.completeMilestone(commissionId, IDecidendiEscrow.Milestone.DELIVERED);
        vm.stopPrank();

        vm.prank(payer);
        escrow.dispute(commissionId, "Missing features from PRD");

        IDecidendiEscrow.CommissionData memory c = escrow.getCommission(commissionId);
        assertTrue(c.disputed);

        uint256 payerBefore = usdc.balanceOf(payer);
        uint256 treasuryBefore = usdc.balanceOf(treasury);

        vm.prank(arbiter);
        escrow.resolveDispute(commissionId, 5_000); // 50% refund

        assertEq(usdc.balanceOf(payer), payerBefore + DEPOSIT / 2);
        assertEq(usdc.balanceOf(treasury), treasuryBefore + DEPOSIT / 2);
    }

    function test_dispute_revert_afterFinalized() public {
        _fullLifecycle();

        vm.prank(payer);
        vm.expectRevert("Decidendi: cannot dispute finalized commission");
        escrow.dispute(commissionId, "too late");
    }

    // ─── voidContract ─────────────────────────────────────────────────

    function test_voidContract_afterDeadline() public {
        _lockDeposit();

        vm.warp(block.timestamp + 31 days);

        uint256 payerBefore = usdc.balanceOf(payer);

        vm.prank(payer);
        escrow.voidContract(commissionId);

        assertEq(usdc.balanceOf(payer), payerBefore + DEPOSIT);

        IDecidendiEscrow.CommissionData memory c = escrow.getCommission(commissionId);
        assertTrue(c.voided);
    }

    function test_voidContract_revert_beforeDeadline() public {
        _lockDeposit();

        vm.prank(payer);
        vm.expectRevert("Decidendi: deadline not yet exceeded");
        escrow.voidContract(commissionId);
    }

    // ─── reclaimExpired ───────────────────────────────────────────────

    function test_reclaimExpired() public {
        _lockDeposit();

        vm.warp(block.timestamp + 30 days + 30 days + 1);

        uint256 payerBefore = usdc.balanceOf(payer);

        vm.prank(address(0xDEAD)); // anyone can call
        escrow.reclaimExpired(commissionId);

        assertEq(usdc.balanceOf(payer), payerBefore + DEPOSIT);
    }

    // ─── extendDeadline ─────────────────────────────────────────────

    function test_extendDeadline() public {
        _lockDeposit();

        IDecidendiEscrow.CommissionData memory c = escrow.getCommission(commissionId);
        uint256 oldDeadline = c.deadlineAt;
        uint256 newDeadline = oldDeadline + 14 days;

        vm.prank(operator);
        escrow.extendDeadline(commissionId, newDeadline);

        c = escrow.getCommission(commissionId);
        assertEq(c.deadlineAt, newDeadline);
    }

    function test_extendDeadline_revert_earlierDeadline() public {
        _lockDeposit();

        vm.prank(operator);
        vm.expectRevert("Decidendi: new deadline must be later");
        escrow.extendDeadline(commissionId, block.timestamp + 1);
    }

    function test_extendDeadline_revert_nonOperator() public {
        _lockDeposit();

        vm.prank(payer);
        vm.expectRevert("Decidendi: caller is not operator");
        escrow.extendDeadline(commissionId, block.timestamp + 60 days);
    }

    // ─── Emergency pause ──────────────────────────────────────────────

    function test_emergencyPause() public {
        vm.prank(arbiter);
        escrow.emergencyPause();

        vm.prank(operator);
        vm.expectRevert();
        escrow.lockDeposit(commissionId, payer, DEPOSIT, FINAL_AMOUNT, block.timestamp + 1 days, prdHash);

        vm.prank(arbiter);
        escrow.unpause();

        vm.prank(operator);
        escrow.lockDeposit(commissionId, payer, DEPOSIT, FINAL_AMOUNT, block.timestamp + 1 days, prdHash);
    }

    // ─── Fuzz: lockDeposit amounts ────────────────────────────────────

    function testFuzz_lockDeposit(uint256 depositAmt, uint256 finalAmt) public {
        depositAmt = bound(depositAmt, 1, 1_000_000e6);
        finalAmt = bound(finalAmt, 0, 1_000_000e6);

        usdc.mint(operator, depositAmt);

        bytes32 fuzzId = keccak256(abi.encodePacked(depositAmt, finalAmt));

        vm.prank(operator);
        escrow.lockDeposit(fuzzId, payer, depositAmt, finalAmt, block.timestamp + 1 days, prdHash);

        IDecidendiEscrow.CommissionData memory c = escrow.getCommission(fuzzId);
        assertEq(c.depositAmount, depositAmt);
        assertEq(c.finalAmount, finalAmt);
        assertEq(c.totalAmount, depositAmt + finalAmt);
    }

    // ─── Fuzz: dispute resolution refund percentage ───────────────────

    function testFuzz_resolveDispute(uint256 refundBps) public {
        refundBps = bound(refundBps, 0, 10_000);

        _lockDeposit();

        vm.prank(payer);
        escrow.dispute(commissionId, "fuzz dispute");

        uint256 payerBefore = usdc.balanceOf(payer);
        uint256 treasuryBefore = usdc.balanceOf(treasury);

        vm.prank(arbiter);
        escrow.resolveDispute(commissionId, refundBps);

        uint256 expectedRefund = (DEPOSIT * refundBps) / 10_000;
        uint256 expectedPayee = DEPOSIT - expectedRefund;

        assertEq(usdc.balanceOf(payer), payerBefore + expectedRefund);
        assertEq(usdc.balanceOf(treasury), treasuryBefore + expectedPayee);
    }

    // ─── Helpers ──────────────────────────────────────────────────────

    function _lockDeposit() internal {
        vm.prank(operator);
        escrow.lockDeposit(commissionId, payer, DEPOSIT, FINAL_AMOUNT, block.timestamp + 30 days, prdHash);
    }

    function _fullLifecycle() internal {
        _lockDeposit();

        vm.startPrank(operator);
        escrow.completeMilestone(commissionId, IDecidendiEscrow.Milestone.BUILD_COMPLETE);
        escrow.completeMilestone(commissionId, IDecidendiEscrow.Milestone.DELIVERED);
        escrow.clientAccept(commissionId);
        escrow.lockFinal(commissionId);
        vm.stopPrank();

        vm.warp(block.timestamp + 3 days + 1);

        vm.prank(operator);
        escrow.releaseFinal(commissionId);
    }
}
