interface SafetyCheckResult {
  passed: boolean;
  warning?: string;
  escalation?: string;
}

const urgentKeywords = [
  'chest pain', 'cant breathe', 'cannot breathe', 'shortness of breath',
  'severe bleeding', 'unconscious', 'fainting', 'stroke', 'heart attack',
  'suicide', 'kill myself', 'end my life', 'overdose', 'severe pain',
];

const attentionKeywords = [
  'dont feel well', 'not feeling well', 'feeling sick', 'dizzy', 'faint',
  'nausea', 'vomiting', 'weak', 'numbness', 'confusion', 'blurred vision',
  'rapid heartbeat', 'irregular heartbeat', 'palpitations',
];

const prohibitedDiagnosticPhrases = [
  // Do not flag ordinary educational wording such as "if you have symptoms".
  // The agent prompt prevents diagnosis; these patterns catch direct claims.
  'based on this, you have', 'you are diagnosed with',
  'this is definitely your diagnosis', 'you must take', 'you should take',
  'increase your dose', 'decrease your dose', 'stop taking',
  'i prescribe', 'prescription for you',
];

export function classifyInput(message: string): SafetyCheckResult {
  const lower = message.toLowerCase();

  for (const kw of urgentKeywords) {
    if (lower.includes(kw)) {
      return {
        passed: true,
        escalation: 'URGENT: This sounds like it could be a medical emergency. Please seek immediate medical attention or contact your local emergency services (such as 911). Do not wait for an AI response — get help right away.',
      };
    }
  }

  for (const kw of attentionKeywords) {
    if (lower.includes(kw)) {
      return {
        passed: true,
        warning: 'attention',
      };
    }
  }

  return { passed: true };
}

export function validateResponse(response: string): SafetyCheckResult {
  const lower = response.toLowerCase();

  for (const phrase of prohibitedDiagnosticPhrases) {
    if (lower.includes(phrase)) {
      return {
        passed: false,
        warning: `Response contained prohibited diagnostic/prescriptive language: "${phrase}". Response was filtered and replaced.`,
      };
    }
  }

  return { passed: true };
}

export function addSafetyDisclaimer(response: string, urgency: 'normal' | 'attention' | 'urgent'): string {
  if (urgency === 'urgent') {
    return response + '\n\n⚠️ **Important:** If you are experiencing a medical emergency, please contact your local emergency services immediately. This AI assistant cannot provide emergency medical care.';
  }

  if (urgency === 'attention') {
    return response + '\n\n📋 **Note:** This information is for educational and monitoring purposes only. If your symptoms persist or worsen, please consult a healthcare professional.';
  }

  return response + '\n\n*This information is for educational purposes and health monitoring only. It is not a substitute for professional medical advice. Always consult a qualified healthcare provider for medical concerns.*';
}

export function buildEscalationResponse(): string {
  return '⚠️ **Please seek urgent medical attention or contact your local emergency service (such as 911) immediately.**\n\nThe symptoms you described may require immediate medical evaluation. This AI assistant cannot provide emergency care or diagnosis. Please do not delay in seeking professional medical help.';
}
