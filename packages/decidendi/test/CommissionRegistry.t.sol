// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {CommissionRegistry} from "../contracts/CommissionRegistry.sol";

contract CommissionRegistryTest is Test {
    CommissionRegistry public registry;

    address public operator = address(0xA1);
    address public escrow = address(0xA2);
    address public client = address(0xB1);

    bytes32 public commissionId = keccak256("commission-001");
    bytes32 public prdHash = keccak256("prd-json");
    bytes32 public deliveryHash = keccak256("delivery-artifacts");

    function setUp() public {
        registry = new CommissionRegistry(operator, escrow);
    }

    function test_registerCommission() public {
        vm.prank(operator);
        registry.registerCommission(commissionId, prdHash, client, 1000e6, 1500e6);

        CommissionRegistry.RegistryEntry memory entry = registry.verify(commissionId);
        assertEq(entry.prdHash, prdHash);
        assertEq(entry.client, client);
        assertEq(entry.depositAmountUsdc, 1000e6);
        assertEq(entry.finalAmountUsdc, 1500e6);
        assertTrue(entry.registeredAt > 0);
        assertEq(entry.buildCompletedAt, 0);
        assertEq(registry.totalCommissions(), 1);
    }

    function test_registerCommission_revert_nonOperator() public {
        vm.prank(client);
        vm.expectRevert("Registry: caller is not operator");
        registry.registerCommission(commissionId, prdHash, client, 1000e6, 1500e6);
    }

    function test_registerCommission_revert_duplicate() public {
        vm.startPrank(operator);
        registry.registerCommission(commissionId, prdHash, client, 1000e6, 1500e6);
        vm.expectRevert("Registry: already registered");
        registry.registerCommission(commissionId, prdHash, client, 1000e6, 1500e6);
        vm.stopPrank();
    }

    function test_milestoneRecording() public {
        vm.startPrank(operator);
        registry.registerCommission(commissionId, prdHash, client, 1000e6, 1500e6);

        registry.recordBuildComplete(commissionId);
        CommissionRegistry.RegistryEntry memory entry = registry.verify(commissionId);
        assertTrue(entry.buildCompletedAt > 0);

        registry.recordDelivered(commissionId, deliveryHash);
        entry = registry.verify(commissionId);
        assertTrue(entry.deliveredAt > 0);
        assertEq(entry.deliveryHash, deliveryHash);

        registry.recordAccepted(commissionId);
        entry = registry.verify(commissionId);
        assertTrue(entry.acceptedAt > 0);

        registry.recordFinalized(commissionId);
        entry = registry.verify(commissionId);
        assertTrue(entry.finalizedAt > 0);

        vm.stopPrank();
    }

    function test_verifyPrdHash() public {
        vm.prank(operator);
        registry.registerCommission(commissionId, prdHash, client, 1000e6, 1500e6);

        assertTrue(registry.verifyPrdHash(commissionId, prdHash));
        assertFalse(registry.verifyPrdHash(commissionId, keccak256("wrong")));
    }

    function test_recordBuildComplete_revert_double() public {
        vm.startPrank(operator);
        registry.registerCommission(commissionId, prdHash, client, 1000e6, 1500e6);
        registry.recordBuildComplete(commissionId);
        vm.expectRevert("Registry: already recorded");
        registry.recordBuildComplete(commissionId);
        vm.stopPrank();
    }

    function testFuzz_registerMultiple(uint8 count) public {
        count = uint8(bound(count, 1, 50));

        vm.startPrank(operator);
        for (uint256 i = 0; i < count; i++) {
            bytes32 id = keccak256(abi.encodePacked("commission", i));
            registry.registerCommission(id, prdHash, client, 1000e6 * (i + 1), 1500e6);
        }
        vm.stopPrank();

        assertEq(registry.totalCommissions(), count);
    }
}
