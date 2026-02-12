import { prisma } from '../../lib/prisma';
import { SuggestionType, SuggestionStatus } from '@prisma/client';

// Stub for AI service - in production, integrate with Claude API
export async function generateAISuggestion(type: SuggestionType, data: any) {
  console.log(`Generating AI suggestion: ${type}`, data);

  switch (type) {
    case 'EVIDENCE_MAPPING':
      return generateEvidenceMappingSuggestion(data.evidenceId);
    case 'CONTRACT_STRUCTURE':
      return generateContractStructureSuggestion(data.dealId);
    default:
      console.log(`Unsupported suggestion type: ${type}`);
  }
}

async function generateEvidenceMappingSuggestion(evidenceId: string) {
  const evidence = await prisma.evidenceItem.findUnique({
    where: { id: evidenceId },
    include: {
      deal: {
        include: {
          contracts: {
            where: { isEffective: true },
            include: {
              milestones: true,
            },
          },
        },
      },
      attachments: true,
    },
  });

  if (!evidence || !evidence.deal.contracts.length) {
    console.log('No active contract found for evidence mapping');
    return;
  }

  const contract = evidence.deal.contracts[0];
  const milestones = contract.milestones;

  // Simulate AI analysis
  // In production, call Claude API with:
  // - Evidence subject & description
  // - Attachment filenames
  // - Available milestones
  
  // For now, simple keyword matching
  const subject = (evidence.subject || '').toLowerCase();
  const description = (evidence.description || '').toLowerCase();
  const text = `${subject} ${description}`;

  let suggestedMilestoneId = null;
  let confidence = 0;

  for (const milestone of milestones) {
    const milestoneText = `${milestone.title} ${milestone.description || ''}`.toLowerCase();
    const keywords = milestoneText.split(' ').filter(w => w.length > 3);
    
    let matchCount = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        matchCount++;
      }
    }

    const currentConfidence = matchCount / Math.max(keywords.length, 1);
    if (currentConfidence > confidence) {
      confidence = currentConfidence;
      suggestedMilestoneId = milestone.id;
    }
  }

  // Store AI suggestion
  if (suggestedMilestoneId) {
    await prisma.aISuggestion.create({
      data: {
        dealId: evidence.dealId,
        type: SuggestionType.EVIDENCE_MAPPING,
        status: SuggestionStatus.PENDING,
        suggestedJson: {
          evidenceId,
          suggestedMilestoneId,
          reasoning: 'Keyword matching analysis (stub)',
        },
        confidence,
        modelVersion: 'stub-v1',
      },
    });

    // Update evidence with suggestion
    await prisma.evidenceItem.update({
      where: { id: evidenceId },
      data: {
        suggestedMilestoneId,
        mappingConfidence: confidence,
      },
    });

    console.log(`AI suggested milestone ${suggestedMilestoneId} with ${confidence.toFixed(2)} confidence`);
  }
}

async function generateContractStructureSuggestion(dealId: string) {
  // Stub for contract structure suggestion
  console.log(`Generating contract structure suggestion for deal ${dealId}`);
  
  // In production:
  // 1. Analyze deal parties and their roles
  // 2. Suggest appropriate milestones
  // 3. Recommend evidence requirements
  // 4. Identify potential risks
  
  return {
    suggested: true,
    message: 'Contract structure suggestion (stub)',
  };
}

export async function acceptSuggestion(suggestionId: string, reviewedBy: string) {
  return prisma.aISuggestion.update({
    where: { id: suggestionId },
    data: {
      status: SuggestionStatus.ACCEPTED,
      reviewedBy,
      reviewedAt: new Date(),
    },
  });
}

export async function rejectSuggestion(suggestionId: string, reviewedBy: string) {
  return prisma.aISuggestion.update({
    where: { id: suggestionId },
    data: {
      status: SuggestionStatus.REJECTED,
      reviewedBy,
      reviewedAt: new Date(),
    },
  });
}

export async function modifySuggestion(
  suggestionId: string,
  finalJson: any,
  reviewedBy: string
) {
  return prisma.aISuggestion.update({
    where: { id: suggestionId },
    data: {
      status: SuggestionStatus.MODIFIED,
      finalJson,
      reviewedBy,
      reviewedAt: new Date(),
    },
  });
}
