var docTemplates = {};

docTemplates.AI = function(strings, book) {

return `${book.title}\r\n
${strings.author}${strings.translator}${strings.editor}${strings.introducer}\r\n
\r\n
\r\n
About the Book\r\n
\r\n
${book.shortdesc}\r\n
\r\n
\r\n
About the Author(s)\r\n
\r\n
${strings.bios}\r\n
\r\n
\r\n
Bibliographic Details\r\n
\r\n
${book.ISBNs.pbk ? `${formatISBN(book.ISBNs.pbk)} pbk £${book.price.pbk || '?'}\r\n` : ''}
${book.ISBNs.hbk ? `${formatISBN(book.ISBNs.hbk)} hbk £${book.price.hbk || '?'}\r\n` : ''}
${book.ISBNs.ebk ? `${formatISBN(book.ISBNs.ebk)} ebk £${book.price.ebk || '?'}\r\n` : ''}
${book.pages ? `${book.pages}pp\r\n` : ''}
Publication Date: ${(new Date(book.pubdate)).toDateString()}`;

};

docTemplates.PR = function() {};
