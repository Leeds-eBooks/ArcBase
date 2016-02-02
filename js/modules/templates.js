import _ from './underscore'

import {formatISBN} from './util'
import {model} from '../index'

function swapNames(authorObj) {
  const name = authorObj.name,
        sep = name.indexOf(','),
        ln = name.substring(0, sep),
        fn = name.substring(sep + 1).trim();

  return `${fn} ${ln}`
}

function joinMany(array) {
  return {
    '0': 'Unknown',
    '1': array[0],
    '2+': array.join(', ')
  }[array.length < 2 ? `${array.length}` : '2+']
}

export default {

  para: `
`,

  authorString: function(book) {
    const authors = book.authors.filter(author => author.roles.author).map(swapNames)
    return `by ${joinMany(authors)}`
  },

  translatorString: function(book) {
    const translators = book.authors.filter(author => author.roles.translator).map(swapNames)
    return translators.length ? `translated by ${joinMany(translators)}` : ''
  },

  editorString(book) {
    const editors = book.authors.filter(author => author.roles.editor).map(swapNames)
    return editors.length ? `edited by ${joinMany(editors)}` : ''
  },

  introducerString(book) {
    const introducers = book.authors.filter(author => author.roles.introducer).map(swapNames)
    return introducers.length ? `with an introduction by ${joinMany(introducers)}` : ''
  },

  bios(book) {
    return book.authors.map(author => model.getCurrentAuthor(author.name))
      .filter(({biog}) => biog)
      .map(({biog}) => biog)
      .join(this.para + this.para)
  },

  ////////////////////////////////////////

  AI(book) {
return `${book.title}
${
  joinMany(_.compact([
    this.authorString(book),
    this.translatorString(book),
    this.editorString(book),
    this.introducerString(book)
  ]))
}


About the Book

${book.shortdesc}


About the Author(s)

${this.bios(book)}


Bibliographic Details

${book.ISBNs.pbk ? `${formatISBN(book.ISBNs.pbk)} pbk £${book.price.pbk || '?'}` : ''}
${book.ISBNs.hbk ? `${formatISBN(book.ISBNs.hbk)} hbk £${book.price.hbk || '?'}` : ''}
${book.ISBNs.ebk ? `${formatISBN(book.ISBNs.ebk)} ebk £${book.price.ebk || '?'}` : ''}
${book.pages ? `${book.pages}pp` : ''}
Publication Date: ${(new Date(book.pubdate)).toDateString()}`
  },

  ////////////////////////////////////////

  PR(book) {
return `<<< insert logo here >>>
Nanholme Mill, Shaw Wood Road, Todmorden, LANCS OL14 6DA
Tel 01706 812338, Fax 01706 818948
ben@arcpublications.co.uk
www.arcpublications.co.uk @Arc_Poetry

For immediate use ${(new Date()).toDateString()}

ANNOUNCING THE PUBLICATION OF

${book.title}

${
  _.compact([
    this.authorString(book),
    this.translatorString(book),
    this.editorString(book),
    this.introducerString(book)
  ]).join(this.para)
}

${book.shortdesc}

${this.bios(book)}

ENDS

Notes to the Editor:

${book.title}
${
  joinMany(_.compact([
    this.authorString(book),
    this.translatorString(book),
    this.editorString(book),
    this.introducerString(book)
  ]))
}
Publication date: ${(new Date(book.pubdate)).toDateString()}
${book.pages ? `${book.pages} pages` : ''}
${book.ISBNs.pbk ? `${formatISBN(book.ISBNs.pbk)} paperback £${book.price.pbk || '?'}` : ''}
${book.ISBNs.hbk ? `${formatISBN(book.ISBNs.hbk)} hardback £${book.price.hbk || '?'}` : ''}
${book.ISBNs.ebk ? `${formatISBN(book.ISBNs.ebk)} ebook £${book.price.ebk || '?'}` : ''}

Further information can be found on our website www.arcpublications.co.uk
Please contact Tony Ward, Angela Jarman or Ben Styles on 01706 812338
or email ben@arcpublications.co.uk with any queries`
  },

  ////////////////////////////////////////

  CataloguePage(book) {
return `
<style>
  .wrapper {
    margin: 0;
    padding: 2em;
  }
  img {
    width: 35%;
    float: left;
    margin: 1em 2em 2em 1em;
    box-shadow: 0.8em 0.8em 4em rgba(0,0,0,0.5);
  }
  h1 {
    font-family: sans-serif;
  }
  .footer {
    clear: both;
    padding: 1em;
    background-color: #e7edf3;
  }
  .footer > * {
    margin: 0;
    padding: 0;
    font-size: 0.8em;
  }
  p {
    font-size: 1.1em;
  }
  .desc {}
  .author {
    font-size: 1em;
  }
</style>

<div class="wrapper">
  <h1>${book.title}</h1>
  <p class="author">${
    joinMany(_.compact([
      this.authorString(book),
      this.translatorString(book),
      this.editorString(book),
      this.introducerString(book)
    ]))
  }</p>

  <img src="${book.cover_orig._downloadURL}" />

  <p class="desc">${book.shortdesc}</p>

  <div class="footer">
    <h3>Bibliographic Details</h3>
    ${book.ISBNs.pbk ? `<p>${formatISBN(book.ISBNs.pbk)} pbk £${book.price.pbk || '?'}</p>` : ''}
    ${book.ISBNs.hbk ? `<p>${formatISBN(book.ISBNs.hbk)} hbk £${book.price.hbk || '?'}</p>` : ''}
    ${book.ISBNs.ebk ? `<p>${formatISBN(book.ISBNs.ebk)} ebk £${book.price.ebk || '?'}</p>` : ''}
    ${book.pages ? `<p>${book.pages}pp</p>` : ''}
    <p>Publication Date: ${(new Date(book.pubdate)).toDateString()}</p>
  </div>
</div>`.replace(/£/g, '&pound;')
  }
};
