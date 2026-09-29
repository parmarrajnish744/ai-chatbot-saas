export interface GuardrailResult {
  sanitizedText: string;
  isJailbreakAttempt: boolean;
  warnings: string[];
}

export class GuardrailsService {
  private jailbreakPatterns: RegExp[] = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
    /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|rules)/i,
    /you\s+are\s+now\s+(in\s+developer\s+mode|dan|jailbroken|unrestricted)/i,
    /system\s+prompt\s+(reveal|leak|output|print|show)/i,
    /reveal\s+(your\s+)?(secret|internal|system)\s+instructions/i,
    /bypass\s+(all\s+)?safety\s+(filters|checks|guidelines)/i,
  ];

  // Regex for Credit Cards: 13-16 digits with optional dashes/spaces
  private creditCardPattern = /\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{15,16}\b/g;

  // Regex for US SSN (9 digits)
  private ssnPattern = /\b\d{3}[ -]?\d{2}[ -]?\d{4}\b/g;

  /**
   * Sanitizes customer input: strips PII (Credit Cards, SSNs) and checks for jailbreaks.
   */
  sanitizeInput(text: string): GuardrailResult {
    let sanitized = text;
    const warnings: string[] = [];
    let isJailbreakAttempt = false;

    // 1. Detect Jailbreak attempts
    for (const pattern of this.jailbreakPatterns) {
      if (pattern.test(sanitized)) {
        isJailbreakAttempt = true;
        warnings.push(`Suspicious prompt injection pattern detected: ${pattern}`);
        break;
      }
    }

    // 2. Redact Credit Card Numbers
    if (this.creditCardPattern.test(sanitized)) {
      sanitized = sanitized.replace(this.creditCardPattern, '[REDACTED_PAYMENT_CARD]');
      warnings.push('Credit card numbers were redacted for privacy.');
    }

    // 3. Redact Social Security Numbers
    if (this.ssnPattern.test(sanitized)) {
      sanitized = sanitized.replace(this.ssnPattern, '[REDACTED_IDENTIFIER]');
      warnings.push('Sensitive national identifiers were redacted.');
    }

    return {
      sanitizedText: sanitized,
      isJailbreakAttempt,
      warnings,
    };
  }
}

export const guardrailsService = new GuardrailsService();
