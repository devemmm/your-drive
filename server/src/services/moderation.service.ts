import { configureOpenAI } from "../utils/openai";
import { logger } from "../utils/logger";

export interface ModerationResult {
  isValid: boolean;
  message: string;
  category:
    | "transportation"
    | "spam"
    | "inappropriate"
    | "offensive"
    | "unrelated"
    | "safety_concern"
    | "valid";
  relevanceScore: number;
  confidenceScore: number;
}

export interface ModerationContext {
  questionContext?: string;
  previousMessages?: string[];
  userRole?: "USER" | "ADMIN";
  contentType: "chat_message" | "review" | "ride_notes" | "location_name";
}

export class ModerationService {
  private static openai: ReturnType<typeof configureOpenAI> = configureOpenAI();

  // Enhanced profanity and inappropriate content lists
  private static readonly PROFANITY_WORDS: string[] = [
    // Common profanity
    "fuck",
    "shit",
    "damn",
    "bitch",
    "asshole",
    "bastard",
    "crap",
    "piss",
    "slut",
    "whore",
    "fag",
    "retard",
    "nigger",
    "cunt",
    "cock",
    "dick",
    "pussy",
    "dickhead",
    "motherfucker",
    "fucker",
    "shithead",
    "ass",
    "bullshit",
    "fucking",
    "shitty",
    "damned",
    "goddamn",
    "hell",

    // Slurs and offensive terms
    "faggot",
    "dyke",
    "tranny",
    "spic",
    "kike",
    "chink",
    "gook",
    "wop",
    "kraut",
    "polack",
    "mick",
    "dago",
    "wop",
    "coon",
    "spade",
    "jigaboo",

    // Sexual content
    "sex",
    "sexual",
    "porn",
    "pornography",
    "nude",
    "naked",
    "penis",
    "vagina",
    "blowjob",
    "handjob",
    "fuck",
    "screw",
    "bang",
    "shag",
    "bonk",

    // Violence and threats
    "kill",
    "murder",
    "death",
    "die",
    "suicide",
    "bomb",
    "terrorist",
    "attack",
    "fight",
    "punch",
    "hit",
    "beat",
    "stab",
    "shoot",
    "gun",
    "weapon",

    // Drugs and illegal activities
    "drug",
    "cocaine",
    "heroin",
    "marijuana",
    "weed",
    "pot",
    "hash",
    "ecstasy",
    "meth",
    "crack",
    "acid",
    "lsd",
    "pills",
    "overdose",
    "dealer",
    "smuggle",

    // Scam and fraud terms
    "scam",
    "fraud",
    "fake",
    "phishing",
    "hack",
    "steal",
    "rob",
    "cheat",
    "lie",
    "fake",
    "counterfeit",
    "illegal",
    "criminal",
    "jail",
    "prison",
  ];

  private static readonly SPAM_PATTERNS: (string | RegExp)[] = [
    // URLs and links
    /https?:\/\/[^\s]+/g,
    /www\.[^\s]+/g,
    /bit\.ly\/[^\s]+/g,
    /tinyurl\.com\/[^\s]+/g,

    // Phone numbers
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    /\b\d{10}\b/g,

    // Email patterns
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

    // Social media handles
    /@[a-zA-Z0-9_]+/g,
    /#[a-zA-Z0-9_]+/g,

    // Repeated characters
    /(.)\1{4,}/g,

    // ALL CAPS
    /^[A-Z\s!?.,]+$/,

    // Excessive punctuation
    /[!?]{3,}/g,
    /\.{3,}/g,
  ];

  private static readonly SAFETY_CONCERN_PATTERNS: RegExp[] = [
    // Personal information
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{4}\s\d{4}\s\d{4}\s\d{4}\b/g, // Credit card
    /\b\d{3}\s\d{3}\s\d{3}\b/g, // SIN (Canadian)

    // Address patterns
    /\b\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd)\b/gi,

    // Meeting requests outside platform
    /\b(?:meet|meeting|see|visit|come|go|outside|offline|in person|face to face)\b/gi,

    // Personal contact requests
    /\b(?:call|phone|text|message|dm|direct message|contact|reach out)\b/gi,

    // Payment outside platform
    /\b(?:cash|money|pay|payment|transfer|venmo|paypal|etransfer|interac)\b/gi,
  ];

  static async moderateContent(
    content: string,
    context: ModerationContext
  ): Promise<ModerationResult> {
    if (!content || content.trim().length === 0) {
      return {
        isValid: false,
        message: "Content cannot be empty",
        category: "inappropriate",
        relevanceScore: 0,
        confidenceScore: 1,
      };
    }

    // For chat messages, apply strict pre-filtering
    if (context.contentType === "chat_message") {
      const preFilterResult = this.strictPreFilter(content);
      if (!preFilterResult.isValid) {
        return preFilterResult;
      }
    }

    if (!this.openai) {
      return this.enhancedProfanityCheck(content);
    }

    try {
      const contextPrompt = this.buildContextPrompt(context);
      const systemPrompt = this.buildSystemPrompt(context.contentType);

      const completion = await this.openai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt + contextPrompt,
          },
          {
            role: "user",
            content: `Please analyze this content: "${content}"`,
          },
        ],
        temperature: 0,
        max_tokens: 300,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      // Validate the response structure
      if (!this.isValidModerationResult(result)) {
        logger.error("Invalid moderation result structure:", result);
        throw new Error("Invalid moderation response");
      }

      // For chat messages, apply additional strict post-filtering
      if (context.contentType === "chat_message") {
        const postFilterResult = this.strictPostFilter(content, result);
        if (!postFilterResult.isValid) {
          return postFilterResult;
        }
      }

      return result as ModerationResult;
    } catch (error) {
      logger.error("Content moderation failed:", error);

      // Fallback: Use enhanced profanity detection
      const fallbackResult = this.enhancedProfanityCheck(content);
      return fallbackResult;
    }
  }

  private static strictPreFilter(content: string): ModerationResult {
    const lowerContent = content.toLowerCase().trim();

    // Check for profanity
    const hasProfanity = this.PROFANITY_WORDS.some((word) =>
      lowerContent.includes(word.toLowerCase())
    );
    if (hasProfanity) {
      return {
        isValid: false,
        message: "Message contains inappropriate language and cannot be sent",
        category: "inappropriate",
        relevanceScore: 0.3,
        confidenceScore: 0.95,
      };
    }

    // Check for spam patterns
    const hasSpamPatterns = this.SPAM_PATTERNS.some((pattern) => {
      if (typeof pattern === "string") {
        return lowerContent.includes(pattern.toLowerCase());
      }
      return pattern.test(content);
    });
    if (hasSpamPatterns) {
      return {
        isValid: false,
        message: "Message contains spam content and cannot be sent",
        category: "spam",
        relevanceScore: 0.2,
        confidenceScore: 0.9,
      };
    }

    // Note: SAFETY_CONCERN_PATTERNS intentionally not applied here. Its single-word
    // regexes (come/meet/see/visit/wait/cash/pay/...) are the core vocabulary of
    // pickup coordination ("come to the bus station", "I'll pay on arrival") and
    // produced false positives. The AI moderator + strictPostFilter still evaluate
    // off-platform-meetup intent with full message context.

    // Check message length (too short or too long)
    if (content.length < 2) {
      return {
        isValid: false,
        message: "Message is too short",
        category: "inappropriate",
        relevanceScore: 0.1,
        confidenceScore: 1,
      };
    }

    if (content.length > 500) {
      return {
        isValid: false,
        message: "Message is too long (maximum 500 characters)",
        category: "spam",
        relevanceScore: 0.3,
        confidenceScore: 0.9,
      };
    }

    // Check for excessive repetition
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 10 && uniqueWords.size / words.length < 0.3) {
      return {
        isValid: false,
        message: "Message contains excessive repetition",
        category: "spam",
        relevanceScore: 0.2,
        confidenceScore: 0.85,
      };
    }

    return {
      isValid: true,
      message: "",
      category: "valid",
      relevanceScore: 0,
      confidenceScore: 0,
    };
  }

  private static strictPostFilter(
    content: string,
    aiResult: ModerationResult
  ): ModerationResult {
    // If AI already rejected it, keep the rejection
    if (!aiResult.isValid) {
      return aiResult;
    }

    // Additional strict checks even if AI approved
    const lowerContent = content.toLowerCase();

    // Check for transportation relevance
    const transportationKeywords = [
      "ride",
      "car",
      "driver",
      "passenger",
      "pickup",
      "dropoff",
      "location",
      "time",
      "schedule",
      "route",
      "destination",
      "departure",
      "arrival",
      "vehicle",
      "transport",
      "travel",
      "trip",
      "journey",
      "meet",
      "wait",
      "cancel",
      "change",
      "delay",
      "early",
      "late",
      "ready",
      "here",
      "there",
    ];

    const hasTransportationKeywords = transportationKeywords.some((keyword) =>
      lowerContent.includes(keyword)
    );

    // If no transportation keywords and low relevance score, reject
    if (!hasTransportationKeywords && aiResult.relevanceScore < 0.4) {
      return {
        isValid: false,
        message: "Message must be related to the ride or transportation",
        category: "unrelated",
        relevanceScore: aiResult.relevanceScore,
        confidenceScore: 0.8,
      };
    }

    // Check for suspicious patterns that might have been missed
    const suspiciousPatterns = [
      /\b(?:free|money|cash|earn|make money|get paid)\b/gi,
      /\b(?:investment|business|opportunity|work from home)\b/gi,
      /\b(?:dating|relationship|single|marry|marriage)\b/gi,
      /\b(?:weight loss|diet|supplement|vitamin)\b/gi,
      /\b(?:lottery|winner|prize|jackpot)\b/gi,
    ];

    const hasSuspiciousPatterns = suspiciousPatterns.some((pattern) =>
      pattern.test(content)
    );

    if (hasSuspiciousPatterns) {
      return {
        isValid: false,
        message:
          "Message contains inappropriate content for a ride-sharing platform",
        category: "inappropriate",
        relevanceScore: 0.2,
        confidenceScore: 0.9,
      };
    }

    return aiResult;
  }

  private static buildSystemPrompt(
    contentType: "chat_message" | "review" | "ride_notes" | "location_name"
  ): string {
    const basePrompt = `You are a STRICT content moderation AI for Your-Drive, a ride-sharing platform connecting users in Rwanda. Your task is to analyze content and determine if it's appropriate for a safe transportation community.

STRICT MODERATION RULES:
1. NO hate speech, discrimination, harassment, or threatening language of any kind
2. NO explicit sexual content, inappropriate personal requests, or romantic advances
3. NO promotion of illegal activities, drugs, or dangerous behavior
4. NO spam, promotional content, or unrelated business advertisements
5. NO sharing of personal contact information (phone numbers, addresses, social media)
6. NO attempts to arrange meetings outside of the official ride system
7. NO content that could compromise user safety during rides
8. NO political discussions, religious content, or controversial topics
9. NO personal attacks, insults, or disrespectful language
10. NO content unrelated to ride coordination or transportation
11. NO requests for personal information from other users
12. NO attempts to bypass platform safety measures

For CHAT MESSAGES specifically:
- Messages MUST be directly related to the specific ride being discussed
- Only allow ride coordination, pickup/dropoff logistics, and respectful communication
- Reject any personal conversations, social requests, or non-transportation topics
- Be extremely strict about maintaining professional boundaries
- Reject messages that could be interpreted as romantic or personal advances
- Reject messages that attempt to arrange meetings outside the platform
- Reject messages that share or request personal contact information
- Reject messages that discuss topics unrelated to the ride`;

    const typeSpecificPrompts = {
      chat_message: `\n\nFor CHAT MESSAGES: You must be EXTREMELY STRICT. Only allow messages that are:
- Directly related to the specific ride (pickup time, location, delays, etc.)
- Professional and respectful in tone
- Focused on ride coordination only
- Free of any personal or social content

REJECT messages that:
- Are not directly related to the ride
- Contain personal conversation
- Attempt to arrange meetings outside the platform
- Share or request contact information
- Have romantic or personal undertones
- Discuss non-transportation topics
- Are overly casual or informal
- Could be interpreted as advances or inappropriate behavior`,

      review: `\n\nFor USER REVIEWS: Focus on ride experience, driver behavior, vehicle condition, punctuality, and safety. Reviews should be constructive and based on actual ride experience.`,

      ride_notes: `\n\nFor RIDE NOTES: Focus on legitimate ride preferences, special requirements, pickup instructions, or user guidelines. Notes should help facilitate a safe and comfortable ride.`,

      location_name: `\n\nFor LOCATION NAMES: Focus on legitimate landmarks, addresses, or recognizable places. Names should help users identify pickup/dropoff locations clearly.`,
    };

    return (
      basePrompt +
      (typeSpecificPrompts[contentType] || "") +
      `\n\nRespond with a JSON object containing:
- isValid: boolean (true if content is appropriate)
- message: string (explanation if content is rejected, or "Content approved" if valid)
- category: string (transportation, spam, inappropriate, offensive, unrelated, safety_concern, or valid)
- relevanceScore: number (0-1, how relevant the content is to ride-sharing)
- confidenceScore: number (0-1, how confident you are in this assessment)`
    );
  }

  private static buildContextPrompt(context: ModerationContext): string {
    let contextPrompt = "";

    if (context.questionContext) {
      contextPrompt += `\nOriginal Context: "${context.questionContext}"`;
    }

    if (context.previousMessages?.length) {
      contextPrompt += `\nPrevious Messages:\n${context.previousMessages
        .map((msg, i) => `${i + 1}. ${msg}`)
        .join("\n")}`;
    }

    if (context.userRole) {
      contextPrompt += `\nUser Role: ${context.userRole}`;
    }

    return contextPrompt;
  }

  private static isValidModerationResult(result: any): boolean {
    return (
      typeof result === "object" &&
      typeof result.isValid === "boolean" &&
      typeof result.message === "string" &&
      typeof result.category === "string" &&
      typeof result.relevanceScore === "number" &&
      typeof result.confidenceScore === "number" &&
      result.relevanceScore >= 0 &&
      result.relevanceScore <= 1 &&
      result.confidenceScore >= 0 &&
      result.confidenceScore <= 1
    );
  }

  private static enhancedProfanityCheck(content: string): ModerationResult {
    const lowerContent = content.toLowerCase();
    const hasProfanity = this.PROFANITY_WORDS.some((word) =>
      lowerContent.includes(word)
    );

    if (hasProfanity) {
      return {
        isValid: false,
        message: "Content contains inappropriate language and cannot be sent",
        category: "inappropriate",
        relevanceScore: 0.3,
        confidenceScore: 0.95,
      };
    }

    // Check for spam patterns
    const hasSpamPatterns = this.SPAM_PATTERNS.some((pattern) => {
      if (typeof pattern === "string") {
        return lowerContent.includes(pattern.toLowerCase());
      }
      return pattern.test(content);
    });

    if (hasSpamPatterns) {
      return {
        isValid: false,
        message: "Content contains spam patterns and cannot be sent",
        category: "spam",
        relevanceScore: 0.2,
        confidenceScore: 0.9,
      };
    }

    return {
      isValid: true,
      message: "Content approved",
      category: "valid",
      relevanceScore: 0.8,
      confidenceScore: 0.7,
    };
  }

  static async moderateMultipleContents(
    contents: { content: string; context: ModerationContext }[]
  ): Promise<ModerationResult[]> {
    const promises = contents.map(({ content, context }) =>
      this.moderateContent(content, context)
    );

    return Promise.all(promises);
  }
}
