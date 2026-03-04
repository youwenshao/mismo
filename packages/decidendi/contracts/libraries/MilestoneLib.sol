// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IDecidendiEscrow} from "../interfaces/IDecidendiEscrow.sol";

library MilestoneLib {
    /// @dev Validates that the milestone transition is sequential and forward-only.
    function validateTransition(
        IDecidendiEscrow.Milestone current,
        IDecidendiEscrow.Milestone next
    ) internal pure returns (bool) {
        if (next == IDecidendiEscrow.Milestone.BUILD_COMPLETE) {
            return current == IDecidendiEscrow.Milestone.DEPOSIT_LOCKED;
        }
        if (next == IDecidendiEscrow.Milestone.DELIVERED) {
            return current == IDecidendiEscrow.Milestone.BUILD_COMPLETE;
        }
        if (next == IDecidendiEscrow.Milestone.ACCEPTED) {
            return current == IDecidendiEscrow.Milestone.DELIVERED;
        }
        if (next == IDecidendiEscrow.Milestone.FINALIZED) {
            return current == IDecidendiEscrow.Milestone.ACCEPTED;
        }
        return false;
    }
}
