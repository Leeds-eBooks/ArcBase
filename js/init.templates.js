var docTemplates = {};

docTemplates.para = `
`;

docTemplates.swapNames = authorObj => {
  var name = authorObj.name,
      sep = name.indexOf(','),
      ln = name.substring(0, sep),
      fn = name.substring(sep + 1).trim();
  return `${fn} ${ln}`;
};
docTemplates.joinMany = array => {
  return {
    '0': 'Unknown',
    '1': array[0],
    '2': array.join(' and '),
    '3+': array.slice(0,-1).join(', ') + ' and ' + array.slice(-1)
  }[array.length < 3 ? array.length + '' : '3+'];
};

docTemplates.authorString = book => {
  var authors = book.authors.filter(author => author.roles.author).map(docTemplates.swapNames);
  return `by ${docTemplates.joinMany(authors)}`;
};
docTemplates.translatorString = book => {
  var translators = book.authors.filter(author => author.roles.translator).map(docTemplates.swapNames);
  return translators.length ?
    `translated by ${docTemplates.joinMany(translators)}` :
    '';
};
docTemplates.editorString = book => {
  var editors = book.authors.filter(author => author.roles.editor).map(docTemplates.swapNames);
  return editors.length ?
    `edited by ${docTemplates.joinMany(editors)}` :
    '';
};
docTemplates.introducerString = book => {
  var introducers = book.authors.filter(author => author.roles.introducer).map(docTemplates.swapNames);
  return introducers.length ?
    `with an introduction by ${docTemplates.joinMany(introducers)}` :
    '';
};
docTemplates.bios = book =>
  book.authors.map(author => model.getCurrentAuthor(author.name))
  .filter(parseAuthor => parseAuthor.has('biog'))
  .map(parseAuthor => parseAuthor.get('biog'))
  .join(docTemplates.para + docTemplates.para);

////////////////////////////////////////

docTemplates.AI = book => `${book.title}
${
  docTemplates.joinMany(_.compact([
    docTemplates.authorString(book),
    docTemplates.translatorString(book),
    docTemplates.editorString(book),
    docTemplates.introducerString(book)
  ]))
}


About the Book

${book.shortdesc}


About the Author(s)

${docTemplates.bios(book)}


Bibliographic Details

${book.ISBNs.pbk ? `${formatISBN(book.ISBNs.pbk)} pbk £${book.price.pbk || '?'}` : ''}
${book.ISBNs.hbk ? `${formatISBN(book.ISBNs.hbk)} hbk £${book.price.hbk || '?'}` : ''}
${book.ISBNs.ebk ? `${formatISBN(book.ISBNs.ebk)} ebk £${book.price.ebk || '?'}` : ''}
${book.pages ? `${book.pages}pp` : ''}
Publication Date: ${(new Date(book.pubdate)).toDateString()}`;

////////////////////////////////////////

docTemplates.PR = book => `<<< insert logo here >>>
Nanholme Mill, Shaw Wood Road, Todmorden, LANCS OL14 6DA
Tel 01706 812338, Fax 01706 818948
ben@arcpublications.co.uk
www.arcpublications.co.uk @Arc_Poetry

For immediate use ${(new Date()).toDateString()}

ANNOUNCING THE PUBLICATION OF

${book.title}

${
  _.compact([
    docTemplates.authorString(book),
    docTemplates.translatorString(book),
    docTemplates.editorString(book),
    docTemplates.introducerString(book)
  ]).join(docTemplates.para)
}

${book.shortdesc}

${docTemplates.bios(book)}

ENDS

Notes to the Editor:

${book.title}
${
  docTemplates.joinMany(_.compact([
    docTemplates.authorString(book),
    docTemplates.translatorString(book),
    docTemplates.editorString(book),
    docTemplates.introducerString(book)
  ]))
}
Publication date: ${(new Date(book.pubdate)).toDateString()}
${book.pages ? `${book.pages} pages` : ''}
${book.ISBNs.pbk ? `${formatISBN(book.ISBNs.pbk)} paperback £${book.price.pbk || '?'}` : ''}
${book.ISBNs.hbk ? `${formatISBN(book.ISBNs.hbk)} hardback £${book.price.hbk || '?'}` : ''}
${book.ISBNs.ebk ? `${formatISBN(book.ISBNs.ebk)} ebook £${book.price.ebk || '?'}` : ''}

Further information can be found on our website www.arcpublications.co.uk
Please contact Tony Ward, Angela Jarman or Ben Styles on 01706 812338
or email ben@arcpublications.co.uk with any queries`;
