import _ from 'underscore-contrib-up-to-date'
import dedent from 'dedent'
import {formatISBN} from './util'
import {model} from '../index'
import blobUtil from 'blob-util'

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

  AI(book, kvBook) {
    return dedent`
      ${book.title}
      ${
        joinMany(_.compact([
          this.authorString(book),
          this.translatorString(book),
          this.editorString(book),
          this.introducerString(book)
        ]))
      }


      About the Book

      ${
        kvBook.longdesc && kvBook.longdesc.trim() ?
          kvBook.longdesc.trim() :
          kvBook.shortdesc.trim()
      }


      About the Author(s)

      ${this.bios(book)}


      Bibliographic Details

      ${book.ISBNs.pbk ? `${formatISBN(book.ISBNs.pbk)} pbk £${book.price.pbk || '?'}` : ''}
      ${book.ISBNs.hbk ? `${formatISBN(book.ISBNs.hbk)} hbk £${book.price.hbk || '?'}` : ''}
      ${book.ISBNs.ebk ? `${formatISBN(book.ISBNs.ebk)} ebk £${book.price.ebk || '?'}` : ''}
      ${book.pages ? `${book.pages}pp` : ''}
      Publication Date: ${(new Date(book.pubdate)).toDateString()}
    `
  },

  ////////////////////////////////////////

  PR(book) {
    return dedent`
      <<< insert logo here >>>
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
      or email ben@arcpublications.co.uk with any queries
    `
  },

  ////////////////////////////////////////

  async CataloguePage(book) {
    if (!book.cover_orig) throw new Error('missing cover image')
    else return {
      info: {
        title: `${book.title} Catalogue Page`
      },
      content: [
        {
          text: book.title,
          style: 'h1'
        }, {
          text:  joinMany(_.compact([
            this.authorString(book),
            this.translatorString(book),
            this.editorString(book),
            this.introducerString(book)
          ])),
          style: 'author'
        }, {
          margin: [0, 30],
          columns: [
            {
              image: `data:image/jpeg;base64,${
                await Kinvey.File.download(book.cover_orig._id)
                  .then(res => res._data)
                  .then(blob => blobUtil.blobToBase64String(blob))
                }`,
              width: 130
            }, {
              text: book.shortdesc
            }
          ],
          columnGap: 10
        },
        `Publication date: ${(new Date(book.pubdate)).toDateString()}`,
        `${book.pages ? `${book.pages} pages` : ''}`,
        `${book.ISBNs.pbk ? `${formatISBN(book.ISBNs.pbk)} paperback £${book.price.pbk || '?'}` : ''}`,
        `${book.ISBNs.hbk ? `${formatISBN(book.ISBNs.hbk)} hardback £${book.price.hbk || '?'}` : ''}`,
        `${book.ISBNs.ebk ? `${formatISBN(book.ISBNs.ebk)} ebook £${book.price.ebk || '?'}` : ''}`
      ],
      styles: {
        h1: {
          fontSize: 20
        },
        author: {
          fontSize: 12
        }
      },
      pageSize: 'A5'
    }
  }
}
