export interface FeedbackInput {
  commissionId: string
  rating: number
  comment?: string
}

export interface FeedbackResult {
  saved: boolean
  escalated: boolean
}

export async function handleFeedback(
  input: FeedbackInput,
  deps: {
    saveFeedback: (data: FeedbackInput) => Promise<void>
    escalateCommission: (commissionId: string) => Promise<void>
    sendSupportNotification: (commissionId: string, rating: number) => Promise<void>
  },
): Promise<FeedbackResult> {
  await deps.saveFeedback(input)

  const escalated = input.rating < 7
  if (escalated) {
    await deps.escalateCommission(input.commissionId)
    await deps.sendSupportNotification(input.commissionId, input.rating)
  }

  return { saved: true, escalated }
}
