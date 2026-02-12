// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AnchorRegistry
 * @notice Stores immutable hashes of fouad.ai deal events for audit trail
 * @dev This contract does NOT enforce any business logic or handle funds
 *      It only provides a tamper-evident notarization service
 */
contract AnchorRegistry {
    struct Anchor {
        string dealId;
        string eventType;
        bytes32 dataHash;
        uint256 timestamp;
        address submitter;
    }

    // Mapping from anchor ID to anchor data
    mapping(uint256 => Anchor) public anchors;
    
    // Counter for anchor IDs
    uint256 public anchorCount;
    
    // Events
    event EventAnchored(
        uint256 indexed anchorId,
        string indexed dealId,
        string eventType,
        bytes32 dataHash,
        uint256 timestamp,
        address submitter
    );

    /**
     * @notice Anchor a new event to the blockchain
     * @param dealId The unique deal identifier
     * @param eventType The type of event (e.g., "contract_effective", "funding_verified")
     * @param dataHash SHA256 hash of the event data (off-chain)
     * @return anchorId The unique ID for this anchor
     */
    function anchorEvent(
        string calldata dealId,
        string calldata eventType,
        bytes32 dataHash
    ) external returns (uint256 anchorId) {
        require(bytes(dealId).length > 0, "Deal ID cannot be empty");
        require(bytes(eventType).length > 0, "Event type cannot be empty");
        require(dataHash != bytes32(0), "Data hash cannot be zero");

        anchorId = anchorCount++;

        anchors[anchorId] = Anchor({
            dealId: dealId,
            eventType: eventType,
            dataHash: dataHash,
            timestamp: block.timestamp,
            submitter: msg.sender
        });

        emit EventAnchored(
            anchorId,
            dealId,
            eventType,
            dataHash,
            block.timestamp,
            msg.sender
        );

        return anchorId;
    }

    /**
     * @notice Get anchor details by ID
     * @param anchorId The anchor ID to query
     */
    function getAnchor(uint256 anchorId)
        external
        view
        returns (
            string memory dealId,
            string memory eventType,
            bytes32 dataHash,
            uint256 timestamp,
            address submitter
        )
    {
        require(anchorId < anchorCount, "Anchor does not exist");
        
        Anchor memory anchor = anchors[anchorId];
        return (
            anchor.dealId,
            anchor.eventType,
            anchor.dataHash,
            anchor.timestamp,
            anchor.submitter
        );
    }

    /**
     * @notice Verify that a given hash matches the anchored data
     * @param anchorId The anchor ID to verify
     * @param dataHash The hash to verify against
     * @return True if the hash matches
     */
    function verifyAnchor(uint256 anchorId, bytes32 dataHash)
        external
        view
        returns (bool)
    {
        require(anchorId < anchorCount, "Anchor does not exist");
        return anchors[anchorId].dataHash == dataHash;
    }

    /**
     * @notice Get all anchors for a specific deal (note: gas-intensive, use with caution)
     * @param dealId The deal ID to query
     * @return anchorIds Array of anchor IDs for this deal
     */
    function getAnchorsByDeal(string calldata dealId)
        external
        view
        returns (uint256[] memory anchorIds)
    {
        // Count matching anchors
        uint256 count = 0;
        for (uint256 i = 0; i < anchorCount; i++) {
            if (keccak256(bytes(anchors[i].dealId)) == keccak256(bytes(dealId))) {
                count++;
            }
        }

        // Collect matching anchor IDs
        anchorIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < anchorCount; i++) {
            if (keccak256(bytes(anchors[i].dealId)) == keccak256(bytes(dealId))) {
                anchorIds[index++] = i;
            }
        }

        return anchorIds;
    }
}
