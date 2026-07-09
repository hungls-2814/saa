import { describe, it, expect } from 'vitest';
import { applyMarkdownFormat } from './markdown-format';

describe('markdown-format', () => {
  describe('applyMarkdownFormat: bold', () => {
    it('wraps selection with **', () => {
      const result = applyMarkdownFormat('hello world', 0, 5, 'bold');
      expect(result.value).toBe('**hello** world');
      expect(result.selectionStart).toBe(2);
      expect(result.selectionEnd).toBe(7);
    });

    it('uses placeholder for empty selection', () => {
      const result = applyMarkdownFormat('hello world', 5, 5, 'bold');
      expect(result.value).toBe('hello**in đậm** world');
      expect(result.selectionStart).toBe(7);
      expect(result.selectionEnd).toBe(13);
    });

    it('handles mid-string selection', () => {
      const result = applyMarkdownFormat('the quick brown fox', 4, 9, 'bold');
      expect(result.value).toBe('the **quick** brown fox');
    });

    it('handles start-of-string selection', () => {
      const result = applyMarkdownFormat('hello', 0, 5, 'bold');
      expect(result.value).toBe('**hello**');
    });

    it('handles end-of-string selection', () => {
      const result = applyMarkdownFormat('hello', 0, 5, 'bold');
      expect(result.value).toBe('**hello**');
    });
  });

  describe('applyMarkdownFormat: italic', () => {
    it('wraps selection with *', () => {
      const result = applyMarkdownFormat('hello world', 0, 5, 'italic');
      expect(result.value).toBe('*hello* world');
      expect(result.selectionStart).toBe(1);
      expect(result.selectionEnd).toBe(6);
    });

    it('uses placeholder for empty selection', () => {
      const result = applyMarkdownFormat('text here', 4, 4, 'italic');
      expect(result.value).toContain('*in nghiêng*');
    });
  });

  describe('applyMarkdownFormat: strikethrough', () => {
    it('wraps selection with ~~', () => {
      const result = applyMarkdownFormat('hello world', 0, 5, 'strikethrough');
      expect(result.value).toBe('~~hello~~ world');
      expect(result.selectionStart).toBe(2);
      expect(result.selectionEnd).toBe(7);
    });

    it('uses placeholder for empty selection', () => {
      const result = applyMarkdownFormat('text here', 4, 4, 'strikethrough');
      expect(result.value).toContain('~~gạch ngang~~');
    });
  });

  describe('applyMarkdownFormat: quote', () => {
    it('prefixes single line with > ', () => {
      const result = applyMarkdownFormat('hello world', 0, 11, 'quote');
      expect(result.value).toBe('> hello world');
    });

    it('prefixes each line in multi-line selection', () => {
      const text = 'line one\nline two';
      const result = applyMarkdownFormat(text, 0, text.length, 'quote');
      expect(result.value).toBe('> line one\n> line two');
    });

    it('handles selection starting mid-line', () => {
      const text = 'start middle end';
      const result = applyMarkdownFormat(text, 6, 12, 'quote');
      expect(result.value).toBe('> start middle end');
    });

    it('only affects the touched lines', () => {
      const text = 'line1\nline2\nline3';
      const result = applyMarkdownFormat(text, 6, 11, 'quote');
      // The function finds the line start of the selection (position 6 is in line2)
      // and line end of selection (position 11 is in line2), so only line2 is affected
      expect(result.value).toBe('line1\n> line2\nline3');
    });
  });

  describe('applyMarkdownFormat: numbered-list', () => {
    it('prefixes single line with 1. ', () => {
      const result = applyMarkdownFormat('hello world', 0, 11, 'numbered-list');
      expect(result.value).toBe('1. hello world');
    });

    it('prefixes each line with incrementing numbers', () => {
      const text = 'first\nsecond\nthird';
      const result = applyMarkdownFormat(text, 0, text.length, 'numbered-list');
      expect(result.value).toBe('1. first\n2. second\n3. third');
    });

    it('starts numbering at 1 for partial selection', () => {
      const text = 'ignored\nfirst\nsecond';
      const result = applyMarkdownFormat(text, 8, text.length, 'numbered-list');
      expect(result.value).toBe('ignored\n1. first\n2. second');
    });
  });

  describe('applyMarkdownFormat: link', () => {
    it('wraps selection as markdown link with provided url', () => {
      const result = applyMarkdownFormat('click here', 0, 10, 'link', 'https://example.com');
      expect(result.value).toBe('[click here](https://example.com)');
    });

    it('uses placeholder text for empty selection', () => {
      const result = applyMarkdownFormat('text', 2, 2, 'link', 'https://example.com');
      expect(result.value).toBe('te[liên kết](https://example.com)xt');
    });

    it('falls back to https:// for empty url', () => {
      const result = applyMarkdownFormat('link', 0, 4, 'link', '');
      expect(result.value).toBe('[link](https://)');
    });

    it('falls back to https:// for whitespace-only url', () => {
      const result = applyMarkdownFormat('link', 0, 4, 'link', '   ');
      expect(result.value).toBe('[link](https://)');
    });

    it('trims url whitespace', () => {
      const result = applyMarkdownFormat('link', 0, 4, 'link', '  https://example.com  ');
      expect(result.value).toBe('[link](https://example.com)');
    });

    it('cursor is at end of link markdown', () => {
      const result = applyMarkdownFormat('x', 0, 1, 'link', 'https://example.com');
      expect(result.selectionStart).toBe('[x](https://example.com)'.length);
      expect(result.selectionEnd).toBe('[x](https://example.com)'.length);
    });
  });

  describe('edge cases', () => {
    it('handles empty text', () => {
      const result = applyMarkdownFormat('', 0, 0, 'bold');
      expect(result.value).toBe('**in đậm**');
    });

    it('handles zero-width selection at start', () => {
      const result = applyMarkdownFormat('hello', 0, 0, 'italic');
      expect(result.value).toBe('*in nghiêng*hello');
    });

    it('handles zero-width selection at end', () => {
      const result = applyMarkdownFormat('hello', 5, 5, 'bold');
      expect(result.value).toBe('hello**in đậm**');
    });

    it('handles selection spanning entire multiline text', () => {
      const text = 'line1\nline2\nline3';
      const result = applyMarkdownFormat(text, 0, text.length, 'numbered-list');
      expect(result.value).toBe('1. line1\n2. line2\n3. line3');
    });
  });

  describe('selection restoration', () => {
    it('selection follows wrapped text for bold', () => {
      const result = applyMarkdownFormat('hello world', 0, 5, 'bold');
      const selected = result.value.slice(result.selectionStart, result.selectionEnd);
      expect(selected).toBe('hello');
    });

    it('selection includes placeholder for empty bold', () => {
      const result = applyMarkdownFormat('hello', 2, 2, 'bold');
      const selected = result.value.slice(result.selectionStart, result.selectionEnd);
      expect(selected).toBe('in đậm');
    });
  });
});
