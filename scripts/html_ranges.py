"""Locate source HTML elements without serializing or altering article code."""
from html.parser import HTMLParser

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


class Node:
    def __init__(self, tag, attrs, start, open_end):
        self.tag, self.attrs = tag, dict(attrs)
        self.start, self.open_end = start, open_end
        self.close_start = self.end = open_end


class HTMLRanges(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.source, self.nodes, self.stack = source, [], []
        self.lines = [0] + [i + 1 for i, char in enumerate(source) if char == '\n']
        self.feed(source)

    def position(self):
        line, column = self.getpos()
        return self.lines[line - 1] + column

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.position(), self.position() + len(self.get_starttag_text()))
        self.nodes.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.stack.pop()

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i].tag == tag:
                node = self.stack[i]
                node.close_start = self.position()
                node.end = self.source.index('>', self.position()) + 1
                self.stack = self.stack[:i]
                break

    def find(self, tag=None, **attrs):
        return next(node for node in self.nodes if (tag is None or node.tag == tag)
                    and all(node.attrs.get(key.replace('_', '-')) == value for key, value in attrs.items()))


def replace_ranges(source, replacements):
    for start, end, value in sorted(replacements, reverse=True):
        source = source[:start] + value + source[end:]
    return source
