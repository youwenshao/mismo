// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DecidendiEscrow} from "./DecidendiEscrow.sol";

/**
 * @title DecidendiArbiter
 * @notice 2-of-3 multi-sig for dispute resolution and emergency operations.
 *         Signers: Mismo founder, independent auditor, rotating community member.
 *         Only activated when a dispute is raised on DecidendiEscrow.
 */
contract DecidendiArbiter {
    uint256 public constant REQUIRED_CONFIRMATIONS = 2;
    uint256 public constant MAX_SIGNERS = 3;

    address[3] public signers;
    DecidendiEscrow public escrow;

    struct Proposal {
        bytes32 commissionId;
        uint256 refundBps;
        ProposalType proposalType;
        uint256 confirmations;
        bool executed;
        uint256 createdAt;
    }

    enum ProposalType {
        RESOLVE_DISPUTE,
        EMERGENCY_PAUSE,
        EMERGENCY_UNPAUSE,
        SET_OPERATOR
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasConfirmed;

    event ProposalCreated(
        uint256 indexed proposalId,
        ProposalType proposalType,
        bytes32 commissionId,
        uint256 refundBps,
        address proposer
    );
    event ProposalConfirmed(uint256 indexed proposalId, address signer);
    event ProposalExecuted(uint256 indexed proposalId);

    modifier onlySigner() {
        require(_isSigner(msg.sender), "Arbiter: caller is not a signer");
        _;
    }

    constructor(address[3] memory _signers, address _escrow) {
        require(_escrow != address(0), "Arbiter: zero escrow");
        for (uint256 i = 0; i < MAX_SIGNERS; i++) {
            require(_signers[i] != address(0), "Arbiter: zero signer");
            for (uint256 j = 0; j < i; j++) {
                require(_signers[i] != _signers[j], "Arbiter: duplicate signer");
            }
        }

        signers = _signers;
        escrow = DecidendiEscrow(_escrow);
    }

    function proposeResolveDispute(
        bytes32 commissionId,
        uint256 refundBps
    ) external onlySigner returns (uint256) {
        require(refundBps <= 10_000, "Arbiter: refundBps exceeds 100%");

        uint256 id = proposalCount++;
        proposals[id] = Proposal({
            commissionId: commissionId,
            refundBps: refundBps,
            proposalType: ProposalType.RESOLVE_DISPUTE,
            confirmations: 1,
            executed: false,
            createdAt: block.timestamp
        });
        hasConfirmed[id][msg.sender] = true;

        emit ProposalCreated(id, ProposalType.RESOLVE_DISPUTE, commissionId, refundBps, msg.sender);
        emit ProposalConfirmed(id, msg.sender);

        return id;
    }

    function proposeEmergencyPause() external onlySigner returns (uint256) {
        uint256 id = proposalCount++;
        proposals[id] = Proposal({
            commissionId: bytes32(0),
            refundBps: 0,
            proposalType: ProposalType.EMERGENCY_PAUSE,
            confirmations: 1,
            executed: false,
            createdAt: block.timestamp
        });
        hasConfirmed[id][msg.sender] = true;

        emit ProposalCreated(id, ProposalType.EMERGENCY_PAUSE, bytes32(0), 0, msg.sender);
        emit ProposalConfirmed(id, msg.sender);

        return id;
    }

    function proposeEmergencyUnpause() external onlySigner returns (uint256) {
        uint256 id = proposalCount++;
        proposals[id] = Proposal({
            commissionId: bytes32(0),
            refundBps: 0,
            proposalType: ProposalType.EMERGENCY_UNPAUSE,
            confirmations: 1,
            executed: false,
            createdAt: block.timestamp
        });
        hasConfirmed[id][msg.sender] = true;

        emit ProposalCreated(id, ProposalType.EMERGENCY_UNPAUSE, bytes32(0), 0, msg.sender);
        emit ProposalConfirmed(id, msg.sender);

        return id;
    }

    function confirm(uint256 proposalId) external onlySigner {
        Proposal storage p = proposals[proposalId];
        require(!p.executed, "Arbiter: already executed");
        require(!hasConfirmed[proposalId][msg.sender], "Arbiter: already confirmed");

        hasConfirmed[proposalId][msg.sender] = true;
        p.confirmations++;

        emit ProposalConfirmed(proposalId, msg.sender);

        if (p.confirmations >= REQUIRED_CONFIRMATIONS) {
            _execute(proposalId);
        }
    }

    function _execute(uint256 proposalId) internal {
        Proposal storage p = proposals[proposalId];
        require(!p.executed, "Arbiter: already executed");
        require(p.confirmations >= REQUIRED_CONFIRMATIONS, "Arbiter: not enough confirmations");

        p.executed = true;

        if (p.proposalType == ProposalType.RESOLVE_DISPUTE) {
            escrow.resolveDispute(p.commissionId, p.refundBps);
        } else if (p.proposalType == ProposalType.EMERGENCY_PAUSE) {
            escrow.emergencyPause();
        } else if (p.proposalType == ProposalType.EMERGENCY_UNPAUSE) {
            escrow.unpause();
        }

        emit ProposalExecuted(proposalId);
    }

    function _isSigner(address account) internal view returns (bool) {
        for (uint256 i = 0; i < MAX_SIGNERS; i++) {
            if (signers[i] == account) return true;
        }
        return false;
    }
}
