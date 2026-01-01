/**
 * Markdown Parser for FlashNote.
 *
 * Parses Markdown content into flashcards based on heading structure.
 * Each heading (# or ##) creates a new card.
 *
 * Example:
 *     const content = "# Title\nContent here\n## Section\nMore content";
 *     const result = parseMarkdown(content);
 *     // result.cards = [
 *     //   { id: "card-1", title: "Title", content: "Content here", level: 1 },
 *     //   { id: "card-2", title: "Section", content: "More content", level: 2 }
 *     // ]
 */

import { ParsedMarkdown, Card } from "@/types/flashnote";

/**
 * Parse Markdown content into flashcards.
 *
 * Splits content by headings and creates a card for each section.
 * Preserves the heading level for hierarchical display.
 *
 * Args:
 *     content: Raw Markdown string to parse.
 *
 * Returns:
 *     ParsedMarkdown object containing cards array and original content.
 *
 * Example:
 *     const md = "# Welcome\nHello world!\n## Features\n- Item 1";
 *     const { cards } = parseMarkdown(md);
 *     console.log(cards.length); // 2
 */
export function parseMarkdown(content: string): ParsedMarkdown {
  const lines = content.split("\n");
  const cards: Card[] = [];
  let currentCard: Partial<Card> | null = null;
  let contentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("#")) {
      // Save current card if exists
      if (currentCard) {
        cards.push({
          ...currentCard,
          content: contentLines.join("\n").trim(),
        } as Card);
        contentLines = [];
      }

      // Create new card
      const level = line.match(/^#+/)?.[0].length || 1;
      const title = line.replace(/^#+\s*/, "").trim();
      currentCard = {
        id: `card-${cards.length + 1}`,
        title,
        level,
      };
    } else if (currentCard) {
      contentLines.push(line);
    }
  }

  // Save last card
  if (currentCard) {
    cards.push({
      ...currentCard,
      content: contentLines.join("\n").trim(),
    } as Card);
  }

  return {
    cards,
    originalContent: content,
  };
}

/**
 * Convert cards back to Markdown format.
 *
 * Args:
 *     cards: Array of Card objects to convert.
 *
 * Returns:
 *     Markdown string representation of the cards.
 *
 * Example:
 *     const cards = [{ id: "1", title: "Test", content: "Hello", level: 1 }];
 *     const md = cardsToMarkdown(cards);
 *     // "# Test\n\nHello"
 */
export function cardsToMarkdown(cards: Card[]): string {
  return cards
    .map((card) => {
      const hashtags = "#".repeat(card.level);
      return `${hashtags} ${card.title}\n\n${card.content}`;
    })
    .join("\n\n");
}

/**
 * Extract title from Markdown content.
 *
 * Finds the first level-1 heading and returns its text.
 *
 * Args:
 *     content: Markdown content string.
 *
 * Returns:
 *     Title string or default "Untitled" if not found.
 *
 * Example:
 *     const title = extractTitle("# My Document\nContent");
 *     // "My Document"
 */
export function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled";
}
