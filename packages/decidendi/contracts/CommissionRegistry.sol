// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IDecidendiEscrow} from "./interfaces/IDecidendiEscrow.sol";

/**
 * @title CommissionRegistry
 * @notice On-chain audit trail for Mismo commissions.
 *         Stores PRD hashes, milestone timestamps, and delivery hashes
 *         for public transparency verification.
 */
contract CommissionRegistry {
    struct RegistryEntry {
        bytes32 commissionId;
        bytes32 prdHash;
        bytes32 deliveryHash;
        address client;
        uint256 registeredAt;
        uint256 buildCompletedAt;
        uint256 deliveredAt;
        uint256 acceptedAt;
        uint256 finalizedAt;
        uint256 depositAmountUsdc;
        uint256 finalAmountUsdc;
    }

    address public operator;
    address public escrow;

    mapping(bytes32 => RegistryEntry) private entries;
    bytes32[] public commissionIds;

    event CommissionRegistered(
        bytes32 indexed commissionId,
        bytes32 prdHash,
        address client,
        uint256 depositAmount,
        uint256 finalAmount
    );
    event MilestoneRecorded(
        bytes32 indexed commissionId,
        string milestone,
        uint256 timestamp
    );
    event DeliveryHashRecorded(bytes32 indexed commissionId, bytes32 deliveryHash);

    modifier onlyOperator() {
        require(msg.sender == operator, "Registry: caller is not operator");
        _;
    }

    constructor(address _operator, address _escrow) {
        require(_operator != address(0), "Registry: zero operator");
        require(_escrow != address(0), "Registry: zero escrow");
        operator = _operator;
        escrow = _escrow;
    }

    function registerCommission(
        bytes32 commissionId,
        bytes32 prdHash,
        address client,
        uint256 depositAmount,
        uint256 finalAmount
    ) external onlyOperator {
        require(entries[commissionId].registeredAt == 0, "Registry: already registered");
        require(client != address(0), "Registry: zero client address");

        entries[commissionId] = RegistryEntry({
            commissionId: commissionId,
            prdHash: prdHash,
            deliveryHash: bytes32(0),
            client: client,
            registeredAt: block.timestamp,
            buildCompletedAt: 0,
            deliveredAt: 0,
            acceptedAt: 0,
            finalizedAt: 0,
            depositAmountUsdc: depositAmount,
            finalAmountUsdc: finalAmount
        });

        commissionIds.push(commissionId);

        emit CommissionRegistered(commissionId, prdHash, client, depositAmount, finalAmount);
    }

    function recordBuildComplete(bytes32 commissionId) external onlyOperator {
        require(entries[commissionId].registeredAt != 0, "Registry: not registered");
        require(entries[commissionId].buildCompletedAt == 0, "Registry: already recorded");

        entries[commissionId].buildCompletedAt = block.timestamp;
        emit MilestoneRecorded(commissionId, "BUILD_COMPLETE", block.timestamp);
    }

    function recordDelivered(
        bytes32 commissionId,
        bytes32 deliveryHash
    ) external onlyOperator {
        require(entries[commissionId].registeredAt != 0, "Registry: not registered");
        require(entries[commissionId].deliveredAt == 0, "Registry: already recorded");

        entries[commissionId].deliveredAt = block.timestamp;
        entries[commissionId].deliveryHash = deliveryHash;

        emit MilestoneRecorded(commissionId, "DELIVERED", block.timestamp);
        emit DeliveryHashRecorded(commissionId, deliveryHash);
    }

    function recordAccepted(bytes32 commissionId) external onlyOperator {
        require(entries[commissionId].registeredAt != 0, "Registry: not registered");
        require(entries[commissionId].acceptedAt == 0, "Registry: already recorded");

        entries[commissionId].acceptedAt = block.timestamp;
        emit MilestoneRecorded(commissionId, "ACCEPTED", block.timestamp);
    }

    function recordFinalized(bytes32 commissionId) external onlyOperator {
        require(entries[commissionId].registeredAt != 0, "Registry: not registered");
        require(entries[commissionId].finalizedAt == 0, "Registry: already recorded");

        entries[commissionId].finalizedAt = block.timestamp;
        emit MilestoneRecorded(commissionId, "FINALIZED", block.timestamp);
    }

    // ─── Public Views (Transparency Dashboard) ───────────────────────

    function verify(bytes32 commissionId) external view returns (RegistryEntry memory) {
        require(entries[commissionId].registeredAt != 0, "Registry: not registered");
        return entries[commissionId];
    }

    function verifyPrdHash(
        bytes32 commissionId,
        bytes32 prdHash
    ) external view returns (bool) {
        return entries[commissionId].prdHash == prdHash;
    }

    function totalCommissions() external view returns (uint256) {
        return commissionIds.length;
    }

    function setOperator(address _operator) external onlyOperator {
        require(_operator != address(0), "Registry: zero address");
        operator = _operator;
    }
}
