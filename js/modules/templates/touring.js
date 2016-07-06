import _ from 'underscore-contrib-up-to-date'
import blobUtil from 'blob-util'
import {formatISBN, joinMany} from '../templates'

export default async function(book) {
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
