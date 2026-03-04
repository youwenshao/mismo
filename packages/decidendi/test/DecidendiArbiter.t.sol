// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {DecidendiEscrow} from "../contracts/DecidendiEscrow.sol";
import {DecidendiArbiter} from "../contracts/DecidendiArbiter.sol";
import {IDecidendiEscrow} from "../contracts/interfaces/IDecidendiEscrow.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC2 is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract DecidendiArbiterTest is Test {
    DecidendiEscrow public escrow;
    DecidendiArbiter public arbiterContract;
    MockUSDC2 public usdc;

    address public operator = address(0xA1);
    address public signer1 = address(0xC1);
    address public signer2 = address(0xC2);
    address public signer3 = address(0xC3);
    address public treasury = address(0xA3);
    address public payer = address(0xB1);

    bytes32 public commissionId = keccak256("commission-arb");
    bytes32 public prdHash = keccak256("prd");

    function setUp() public {
        usdc = new MockUSDC2();

        address[3] memory signers = [signer1, signer2, signer3];

        // Deploy escrow with arbiterContract address (need to predict or set later)
        // Deploy escrow first with a placeholder arbiter, then set it
        escrow = new DecidendiEscrow(address(usdc), operator, address(this), treasury);
        arbiterContract = new DecidendiArbiter(signers, address(escrow));

        // Transfer arbiter role to the arbiter contract
        escrow.setOperator(operator); // already operator
        // We need escrow's arbiter to be the arbiter contract
        // Since constructor set arbiter = address(this), we can call setOperator from arbiter
        // Actually, arbiter cannot be changed in the escrow... Let's redeploy correctly
    }

    function _deployFresh() internal {
        usdc = new MockUSDC2();

        // First deploy escrow with a temp arbiter
        escrow = new DecidendiEscrow(address(usdc), operator, address(1), treasury);

        address[3] memory signers = [signer1, signer2, signer3];
        arbiterContract = new DecidendiArbiter(signers, address(escrow));

        // Redeploy escrow with arbiter contract as arbiter
        escrow = new DecidendiEscrow(address(usdc), operator, address(arbiterContract), treasury);
        arbiterContract = new DecidendiArbiter(signers, address(escrow));

        usdc.mint(operator, 100_000e6);
        usdc.mint(payer, 100_000e6);

        vm.prank(operator);
        usdc.approve(address(escrow), type(uint256).max);
    }

    function test_proposeAndConfirm_emergencyPause() public {
        _deployFresh();

        // Lock a deposit
        vm.prank(operator);
        escrow.lockDeposit(commissionId, payer, 1000e6, 1500e6, block.timestamp + 30 days, prdHash);

        // Signer1 proposes emergency pause
        vm.prank(signer1);
        uint256 proposalId = arbiterContract.proposeEmergencyPause();

        // Signer2 confirms -> executes (2 of 3)
        vm.prank(signer2);
        arbiterContract.confirm(proposalId);

        // Escrow should be paused now
        vm.prank(operator);
        vm.expectRevert();
        escrow.completeMilestone(commissionId, IDecidendiEscrow.Milestone.BUILD_COMPLETE);
    }

    function test_proposeResolveDispute() public {
        _deployFresh();

        vm.prank(operator);
        escrow.lockDeposit(commissionId, payer, 1000e6, 1500e6, block.timestamp + 30 days, prdHash);

        vm.startPrank(operator);
        escrow.completeMilestone(commissionId, IDecidendiEscrow.Milestone.BUILD_COMPLETE);
        escrow.completeMilestone(commissionId, IDecidendiEscrow.Milestone.DELIVERED);
        vm.stopPrank();

        vm.prank(payer);
        escrow.dispute(commissionId, "Missing feature X");

        // Signer1 proposes 70% refund
        vm.prank(signer1);
        uint256 proposalId = arbiterContract.proposeResolveDispute(commissionId, 7_000);

        uint256 payerBefore = usdc.balanceOf(payer);

        // Signer3 confirms -> executes
        vm.prank(signer3);
        arbiterContract.confirm(proposalId);

        // Payer should get 70% of deposit
        assertEq(usdc.balanceOf(payer), payerBefore + 700e6);
    }

    function test_nonSigner_revert() public {
        _deployFresh();

        vm.prank(payer);
        vm.expectRevert("Arbiter: caller is not a signer");
        arbiterContract.proposeEmergencyPause();
    }

    function test_doubleConfirm_revert() public {
        _deployFresh();

        vm.prank(signer1);
        uint256 proposalId = arbiterContract.proposeEmergencyPause();

        vm.prank(signer1);
        vm.expectRevert("Arbiter: already confirmed");
        arbiterContract.confirm(proposalId);
    }
}
