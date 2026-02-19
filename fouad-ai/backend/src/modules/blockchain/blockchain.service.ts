import { prisma } from '../../lib/prisma';
import { ethers } from 'ethers';
import { AnchorStatus } from '@prisma/client';

// ABI for AnchorRegistry contract
const ANCHOR_REGISTRY_ABI = [
  'function anchorEvent(string dealId, string eventType, bytes32 dataHash) returns (uint256)',
  'function getAnchor(uint256 anchorId) view returns (string dealId, string eventType, bytes32 dataHash, uint256 timestamp)',
  'function verifyAnchor(uint256 anchorId, bytes32 dataHash) view returns (bool)',
];

class BlockchainService {
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  constructor() {
    const rpcUrl = process.env.ETHEREUM_RPC_URL;
    const privateKey = process.env.ETHEREUM_PRIVATE_KEY;
    const contractAddress = process.env.ANCHOR_CONTRACT_ADDRESS;

    if (!rpcUrl || !privateKey || !contractAddress) {
      console.warn('⚠️  Blockchain service: Configuration incomplete - running in disabled mode');
      this.provider = null as any;
      this.wallet = null as any;
      this.contract = null as any;
      return;
    }

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.contract = new ethers.Contract(
        contractAddress,
        ANCHOR_REGISTRY_ABI,
        this.wallet
      );
      console.log('✅ Blockchain service initialized');
    } catch (error: any) {
      console.warn('⚠️  Blockchain service: Failed to initialize -', error.message);
      console.warn('   Blockchain anchoring will be disabled');
      this.provider = null as any;
      this.wallet = null as any;
      this.contract = null as any;
    }
  }

  async anchorEvent(
    dealId: string,
    eventType: string,
    dataHash: string
  ): Promise<{ txHash: string; blockNumber: number } | null> {
    if (!this.contract || !this.wallet || !this.provider) {
      return null;
    }

    const tx = await this.contract.anchorEvent(dealId, eventType, dataHash);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async verifyAnchor(anchorId: number, dataHash: string): Promise<boolean | null> {
    if (!this.contract || !this.wallet || !this.provider) {
      return null;
    }

    return this.contract.verifyAnchor(anchorId, dataHash);
  }
}

const blockchainService = new BlockchainService();

export async function anchorToBlockchain(
  dealId: string,
  eventType: string,
  eventId: string,
  dataHash: string
) {
  try {
    // Submit to blockchain
    const result = await blockchainService.anchorEvent(dealId, eventType, dataHash);

    // If blockchain service is unavailable, return null
    if (!result) {
      console.log(`⚠️  Blockchain service unavailable - skipping anchor for ${eventType}`);
      return null;
    }

    // Create pending anchor record
    const anchor = await prisma.blockchainAnchor.create({
      data: {
        dealId,
        eventType,
        eventId,
        dataHash,
        status: AnchorStatus.CONFIRMED,
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        network: process.env.ETHEREUM_NETWORK || 'sepolia',
        submittedAt: new Date(),
        confirmedAt: new Date(),
        metadata: {
          dealId,
          eventType,
          timestamp: new Date().toISOString(),
          version: '1.0',
        },
      },
    });

    console.log(`✅ Anchored ${eventType} to blockchain: ${result.txHash}`);
    return anchor;
  } catch (error) {
    console.error('Blockchain anchoring error:', error);

    // Mark as failed if we have a pending record
    await prisma.blockchainAnchor.updateMany({
      where: {
        dealId,
        eventType,
        status: AnchorStatus.PENDING,
      },
      data: {
        status: AnchorStatus.FAILED,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

export async function getAnchorsForDeal(dealId: string) {
  return prisma.blockchainAnchor.findMany({
    where: { dealId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAnchorById(id: string) {
  return prisma.blockchainAnchor.findUnique({
    where: { id },
  });
}

export async function verifyAnchor(id: string) {
  const anchor = await prisma.blockchainAnchor.findUnique({
    where: { id },
  });

  if (!anchor) {
    throw new Error('Anchor not found');
  }

  if (anchor.status !== AnchorStatus.CONFIRMED) {
    return {
      verified: false,
      reason: 'Anchor not confirmed on blockchain',
    };
  }

  // In production, verify the actual on-chain data
  // For now, we trust our database
  return {
    verified: true,
    txHash: anchor.txHash,
    blockNumber: anchor.blockNumber,
    network: anchor.network,
  };
}
