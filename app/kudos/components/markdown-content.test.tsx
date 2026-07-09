import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { parseInline, MarkdownContent } from './markdown-content';

describe('markdown-content: parseInline', () => {
  it('parses plain text', () => {
    const result = parseInline('hello world');
    expect(result).toEqual([{ type: 'text', value: 'hello world' }]);
  });

  it('parses bold text', () => {
    const result = parseInline('**bold**');
    expect(result).toEqual([{ type: 'bold', value: 'bold' }]);
  });

  it('parses italic with *', () => {
    const result = parseInline('*italic*');
    expect(result).toEqual([{ type: 'italic', value: 'italic' }]);
  });

  it('parses italic with _', () => {
    const result = parseInline('_italic_');
    expect(result).toEqual([{ type: 'italic', value: 'italic' }]);
  });

  it('parses strikethrough', () => {
    const result = parseInline('~~strike~~');
    expect(result).toEqual([{ type: 'strike', value: 'strike' }]);
  });

  it('parses mention', () => {
    const result = parseInline('@Alice');
    expect(result).toEqual([{ type: 'mention', value: 'Alice' }]);
  });

  it('parses mention with full name', () => {
    const result = parseInline('@John Smith');
    expect(result).toEqual([{ type: 'mention', value: 'John Smith' }]);
  });

  it('parses link', () => {
    const result = parseInline('[text](https://example.com)');
    expect(result).toEqual([{ type: 'link', value: 'text', href: 'https://example.com' }]);
  });

  it('parses http link', () => {
    const result = parseInline('[click](http://example.com)');
    expect(result).toEqual([{ type: 'link', value: 'click', href: 'http://example.com' }]);
  });

  it('rejects non-http link', () => {
    const result = parseInline('[text](ftp://example.com)');
    expect(result).toEqual([{ type: 'text', value: '[text](ftp://example.com)' }]);
  });

  describe('mixed content', () => {
    it('parses text before and after bold', () => {
      const result = parseInline('hello **bold** world');
      expect(result).toEqual([
        { type: 'text', value: 'hello ' },
        { type: 'bold', value: 'bold' },
        { type: 'text', value: ' world' },
      ]);
    });

    it('parses multiple bold sections', () => {
      const result = parseInline('**first** and **second**');
      expect(result).toEqual([
        { type: 'bold', value: 'first' },
        { type: 'text', value: ' and ' },
        { type: 'bold', value: 'second' },
      ]);
    });

    it('parses bold and italic together', () => {
      const result = parseInline('**bold** and *italic*');
      expect(result).toEqual([
        { type: 'bold', value: 'bold' },
        { type: 'text', value: ' and ' },
        { type: 'italic', value: 'italic' },
      ]);
    });

    it('parses bold with mention', () => {
      const result = parseInline('**bold** @John');
      expect(result).toEqual([
        { type: 'bold', value: 'bold' },
        { type: 'text', value: ' ' },
        { type: 'mention', value: 'John' },
      ]);
    });

    it('parses link and mention', () => {
      const result = parseInline('[link](https://example.com) @Alice');
      expect(result).toEqual([
        { type: 'link', value: 'link', href: 'https://example.com' },
        { type: 'text', value: ' ' },
        { type: 'mention', value: 'Alice' },
      ]);
    });
  });

  describe('precedence', () => {
    it('link takes precedence over bold', () => {
      const result = parseInline('[**text**](https://example.com)');
      // Link matches first, not inner bold
      expect(result[0].type).toBe('link');
    });

    it('bold takes precedence over italic when not nested', () => {
      const result = parseInline('**bold** and *italic*');
      // Bold matches first
      expect(result[0].type).toBe('bold');
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = parseInline('');
      expect(result).toEqual([]);
    });

    it('ignores unclosed markers', () => {
      const result = parseInline('**unclosed');
      expect(result).toEqual([{ type: 'text', value: '**unclosed' }]);
    });

    it('ignores malformed link', () => {
      const result = parseInline('[no url](');
      expect(result).toEqual([{ type: 'text', value: '[no url](' }]);
    });

    it('handles mention with spaces', () => {
      const result = parseInline('@Alice Bob Smith');
      expect(result).toEqual([{ type: 'mention', value: 'Alice Bob Smith' }]);
    });

    it('handles mention at start and end', () => {
      const result = parseInline('@Alice @Bob');
      expect(result).toEqual([
        { type: 'mention', value: 'Alice' },
        { type: 'text', value: ' ' },
        { type: 'mention', value: 'Bob' },
      ]);
    });

    it('handles multiple spaces', () => {
      const result = parseInline('text   with   spaces');
      expect(result).toEqual([{ type: 'text', value: 'text   with   spaces' }]);
    });
  });

  describe('special characters', () => {
    it('handles unicode in mentions', () => {
      const result = parseInline('@Nguyễn Văn A');
      expect(result).toEqual([{ type: 'mention', value: 'Nguyễn Văn A' }]);
    });

    it('preserves unicode in text', () => {
      const result = parseInline('Xin chào thế giới');
      expect(result).toEqual([{ type: 'text', value: 'Xin chào thế giới' }]);
    });
  });
});

describe('markdown-content: MarkdownContent component', () => {
  it('renders plain text', () => {
    const { container } = render(<MarkdownContent content="hello world" />);
    expect(container.textContent).toContain('hello world');
  });

  it('renders bold as strong', () => {
    const { container } = render(<MarkdownContent content="**bold**" />);
    const strong = container.querySelector('strong');
    expect(strong?.textContent).toBe('bold');
  });

  it('renders italic as em', () => {
    const { container } = render(<MarkdownContent content="*italic*" />);
    const em = container.querySelector('em');
    expect(em?.textContent).toBe('italic');
  });

  it('renders strike as del', () => {
    const { container } = render(<MarkdownContent content="~~strike~~" />);
    const del = container.querySelector('del');
    expect(del?.textContent).toBe('strike');
  });

  it('renders mention as span with red color', () => {
    const { container } = render(<MarkdownContent content="@John" />);
    const mention = container.querySelector('span.text-\\[\\#D4271D\\]');
    expect(mention?.textContent).toBe('@John');
  });

  it('renders link as anchor', () => {
    const { container } = render(
      <MarkdownContent content="[click](https://example.com)" />
    );
    const link = container.querySelector('a');
    expect(link?.textContent).toBe('click');
    expect(link?.getAttribute('href')).toBe('https://example.com');
    expect(link?.getAttribute('target')).toBe('_blank');
  });

  it('renders multiple lines', () => {
    const { container } = render(<MarkdownContent content="line1\nline2" />);
    const p = container.querySelector('p');
    expect(p?.textContent).toContain('line1');
    expect(p?.textContent).toContain('line2');
  });

  it('renders quote line with quote formatting', () => {
    const { container } = render(<MarkdownContent content="> quoted text" />);
    const em = container.querySelector('em');
    expect(em?.textContent).toContain('quoted text');
  });

  it('renders bullet list marker', () => {
    const { container } = render(<MarkdownContent content="- item" />);
    expect(container.textContent).toContain('•');
    expect(container.textContent).toContain('item');
  });

  it('renders ordered list with number', () => {
    const { container } = render(<MarkdownContent content="1. first\n2. second" />);
    expect(container.textContent).toContain('1.');
    expect(container.textContent).toContain('2.');
    expect(container.textContent).toContain('first');
    expect(container.textContent).toContain('second');
  });

  it('applies custom className', () => {
    const { container } = render(
      <MarkdownContent content="text" className="custom-class" />
    );
    const p = container.querySelector('p');
    expect(p?.className).toContain('custom-class');
  });

  it('handles multiline with various formats', () => {
    const content = '**bold** line\n*italic* line\n> quote';
    const { container } = render(<MarkdownContent content={content} />);
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('em')?.textContent).toMatch(/italic/);
  });

  it('renders mixed content on same line', () => {
    const { container } = render(
      <MarkdownContent content="before **bold** after" />
    );
    expect(container.textContent).toBe('before bold after');
    expect(container.querySelector('strong')).toBeTruthy();
  });

  it('handles empty content', () => {
    const { container } = render(<MarkdownContent content="" />);
    const p = container.querySelector('p');
    expect(p).toBeTruthy();
  });
});
