Parse.initialize(ArcBase.keys.Parse.a,ArcBase.keys.Parse.b);
var table=document.querySelector('#main table'),
    Book=Parse.Object.extend("Book"),
    Author=Parse.Object.extend("Author"),
    notesOverlay=document.querySelector('.notes-overlay'),
    authorOverlay=document.querySelector('.author-overlay'),
    authorModal=document.querySelector('.author-modal'),
    // bookRows=document.getElementsByClassName('book-rows'),
    model;

if (!Array.prototype.pushUnique) {
  Object.defineProperty(
    Array.prototype, 'pushUnique', {
      enumerable: false,
      value: function(item) {
        if (!~this.indexOf(item)) {
          return this.push(item);
        } else {
          return false;
        }
      }
    }
  );
}

function alphaNumeric(str, replacement='-') {
  return str.replace(/\W+/g, replacement);
}

rivets.adapters['#']={};
for (var key in rivets.adapters['.']) {
  rivets.adapters['#'][key]=rivets.adapters['.'][key];
}
rivets.adapters['#'].get=function(obj,keypath) {
  return obj && obj.get(keypath);
};
rivets.adapters['#'].set=function(obj, keypath, value) {
  return obj && obj.set(keypath, value);
};

rivets.binders.readonly=function(el, value) {
  el.readOnly=!!value;
};

rivets.formatters.opposite=function(value) {
  return !value;
};
rivets.formatters.prepend=function(value, string) {
  return string ? string+""+value : value;
};
rivets.formatters.alphaNumeric=function(v) {
  return alphaNumeric(v);
};

if (!String.prototype.insert) {
  Object.defineProperty(
    String.prototype, 'insert', {
      enumerable: false,
      value: function(index, substr) {
        return this.substring(0, index) + substr + this.substr(index);
      }
    }
  );
}

function formatISBN(str) {
  return str.insert(3,'-').insert(11,'-').insert(14,'-');
}

function preventAuthorEditing(i) {
  var bookRows = Array.from(document.querySelectorAll('tr.book-rows')),
      authors = Array.from(bookRows[i].querySelectorAll('td.authors > div .author-button'));
  console.log(authors.length);
  authors.forEach(a => {a.readOnly = true;});
}

function clearInputs() {
  model.inputs={
    title: '',
    authors: [{
      name:'',
      roles: {
        author: false,
        translator: false,
        editor: false,
        introducer: false,
        critic: false
      }
    }],
    pubdate: '',
    pages: '',
    shortdesc: '',
    ISBNs: {
      pbk: '',
      hbk: '',
      ebk: ''
    },
    price: {
      pbk: '',
      hbk: '',
      ebk: ''
    },
    button: 'Save'
  };
}

function authorMapper(author) {
  var obj=this;
  if (author && author.get) {
    return {
      name: author.get('name'),
      roles: (obj.get('roleMap') && obj.get('roleMap').find(v => v.id===author.id).roles) || {}
    };
  } else {
    return {
      name: "",
      roles: {}
    };
  }
}

function update(newBook, load150more) {
  var query=new Parse.Query(Book),
      amountToSkip=load150more ?
        model.books.length :
        0;

  if (newBook) query.equalTo('objectId', newBook.id);

  function whenLoaded(results) {
    results.forEach(pb => { // pb = parseBook
      var existingBook=model.books.find(book => book.id===pb.id);

      model.parseBooks.pushUnique(pb);

      if (pb.has('authors')) {
        pb.get('authors').forEach(author => {
          if (!model.authors.some(a => a.get('name') === author.get('name'))) {
            model.authors.push(author);
          }
        });
      }

      if (existingBook) {
        existingBook.id=pb.id;
        existingBook.title=pb.get('title');
        existingBook.coverimg=pb.has('cover_200') ? pb.get('cover_200').url() : '';
        existingBook.authors=(pb.get('authors') && pb.get('authors').map(authorMapper,pb)) || [];
        existingBook.pubdate=pb.get('pubdate');
        existingBook.pages=pb.get('pages');
        existingBook.shortdesc=pb.get('shortdesc');
        existingBook.ISBNs=pb.get('ISBNs') && pb.get('ISBNs').reduce((obj, current) => {
          obj[current.type]=current.value;
          return obj;
        }, {});
        existingBook.price=(pb.get('price') && pb.get('price').reduce((obj, current) => {
          obj[current.type]=current.value;
          return obj;
        }, {})) || {pbk:'', hbk:'', ebk:''};
        existingBook.button='Edit';
      } else {
        let method=results.length>1 ? 'push' : 'unshift';
        model.books[method]({
          id: pb.id,
          title: pb.get('title'),
          coverimg: pb.has('cover_200') ? pb.get('cover_200').url() : '',
          authors: (pb.get('authors') && pb.get('authors').map(authorMapper,pb)) || [],
          pubdate: pb.get('pubdate'),
          pages: pb.get('pages'),
          shortdesc: pb.get('shortdesc'),
          ISBNs: pb.get('ISBNs') && pb.get('ISBNs').reduce((obj, current) => {
            obj[current.type]=current.value;
            return obj;
          }, {}),
          price: (pb.get('price') && pb.get('price').reduce((obj, current) => {
            obj[current.type]=current.value;
            return obj;
          }, {})) || {pbk:'',hbk:'',ebk:''},
          /* Methods */
          button: 'Edit',
          addAuthor(event,scope) {
            scope.book.authors.push({
              name:'',
              roles: {
                author: false,
                translator: false,
                editor: false,
                introducer: false,
                critic: false
              }
            });
          },
          isEditing() {
            return this.button==='Save';
          },
        });
      }
    });

    if (newBook) clearInputs();
  }

  query.descending('pubdate').skip(amountToSkip).limit(150).include('authors').find()
    .then(whenLoaded).fail(function(err) {
      console.log(JSON.stringify(err));
    });
}

function saveToParse(data, bookToEdit) {
  var query=new Parse.Query(Book),
      book=bookToEdit ?
        query.get(bookToEdit.id) :
        new Book();

  function save(book) {
    book.save(data, {
      success: update, // update(newBook)
      error: function(book, error) {
        console.error(JSON.stringify(error));
      }
    });
  }

  if (bookToEdit) {
    book.then(save);
  } else {
    save(book);
  }
}

function getParseAuthors(authorsArray) {
  return new Promise(function(resolve, reject) {
    var query=new Parse.Query(Author);
    query.containedIn('name',authorsArray);
    query.find({
      success: function(res) {
        var savedAuthorNames=res.map(v => v.get('name')),
            promisedAuthors;
        if (savedAuthorNames.length!==authorsArray.length) {
          promisedAuthors=authorsArray.map(v => {
            if (!~savedAuthorNames.indexOf(v)) {
              let newAuthor=new Author();
              return newAuthor.save({name: v});
            } else {
              return res.find(w => w.get('name')===v);
            }
          });
          Promise.all(promisedAuthors).then(resolve);
        } else {
          resolve(res);
        }
      }, error: reject
    });
  });
}

model={
  authors: [],
  parseBooks: [],
  books: [],
  inputs: {
    title: '',
    authors: [{
      name:'',
      roles: {
        author: false,
        translator: false,
        editor: false,
        introducer: false,
        critic: false
      }
    }],
    pubdate: '',
    pages: '',
    shortdesc: '',
    ISBNs: {
      pbk: '',
      hbk: '',
      ebk: ''
    },
    price: {
      pbk: '',
      hbk: '',
      ebk: ''
    },
    button: 'Save'
  },
  selectAll() {
    if (this.readOnly) {this.select();}
  },
  addAuthor() {
    model.inputs.authors.push({
      name:'',
      roles: {
        author: false,
        translator: false,
        editor: false,
        introducer: false,
        critic: false
      }
    });
  },
  load150more() {
    update(false, true);
  },

  submit(event, modelArg, bookToEdit) {
    var data={},
        inputModel=bookToEdit||model.inputs,
        tempInput,tempKey,authors=[],replacedAuthorMap={}, coverFile;

    function continueSubmit(replacedAuthors) {
      if (!inputModel.title.trim()) {
        alert('Every book needs a title...');
        return false;
      } else if (inputModel.authors.some(v => v.name.trim() && !v.name.includes(','))) {
        alert('Author names must be Lastname, Firstname');
        return false;
      } else {
        if (!bookToEdit) {model.inputs.button='<img class="loading" src="images/loading.gif">';}
        for (var key in inputModel) {
          tempInput=inputModel[key];
          tempKey=key;

          if (tempKey==='authors') {
            tempInput.forEach(v => {
              var replacement=replacedAuthors && replacedAuthors.find(r => r[0].submitted.name===v.name);
              if (replacement) {
                let newName=replacement[0].author.get("name");
                replacedAuthorMap[newName]=v;
                authors.push(newName);
              } else {
                v.name.trim() && authors.push(v.name.trim().replace(/\s{1,}/g,' '));
              }
            });
          } else if (tempKey==='ISBNs') {
            data.ISBNs=Object.keys(tempInput).map(v => {
              return {type:v,value:tempInput[v].replace(/\D+/g,'')};
            });
          } else if (tempKey==='price') {
            data.price=Object.keys(tempInput).map(v => {
              return {type:v,value:tempInput[v]};
            });
          } else if (tempKey==='cover_orig') {
            coverFile = new Parse.File(alphaNumeric(inputModel.title, '_') + "_cover.jpg", tempInput);
          } else {
            if ('function'!==typeof tempInput &&
                tempKey!=='button' &&
                tempKey!=='filterOut' &&
                tempKey!=='coverimg') {
              data[tempKey]=tempInput && tempInput.trim().replace(/\s{1,}/g,' ');
            }
          }
        }

        Promise.all([
          getParseAuthors(authors),
          coverFile ? coverFile.save() : Promise.resolve()
        ]).then(function(resArr) {
          var returnedAuthors = resArr[0];
          data.authors = returnedAuthors;
          data.roleMap = [];
          returnedAuthors.forEach(author => {
            var roleModel=inputModel.authors.find(a => a.name===author.get('name')),
                roles=roleModel ? roleModel.roles : replacedAuthorMap[author.get('name')].roles;
            data.roleMap.push({
              id: author.id,
              roles
            });
          });
          data.cover_orig = coverFile;
          saveToParse(data, bookToEdit);
        }).catch(function(err) {console.error(err.message || err);});
        return true;
      }
    }

    return Parse.Cloud.run('checkAuthors', {authors: inputModel.authors}).then(res => {
      var cancelFlag=false,
          replaced=res.filter(r => {
            console.log(r);
            if (r.length===1) {
              let name = r[0].author.get("name");
              return confirm('Did you mean '+name+'?\n\nOk for YES, I MEANT "'+name+
                '"\nCancel for NO, I AM CORRECT');
            } else {
              cancelFlag=confirm("There is an author with a similar name on the database already. If there's a typo, do you want to go back and fix it?\n\nOk for YES, I MADE A MISTAKE\nCancel for NO, I AM CORRECT");
              return cancelFlag;
            }
          });

      if (replaced.length) {
        if (!cancelFlag) continueSubmit(replaced);
      } else {
        continueSubmit();
      }

    }).fail(function(error) {
      console.log(error);
      continueSubmit();
    });
  },

  editOrSubmit(event, scope) {
    if (scope.book.button==='Edit') {
      scope.book.button='Save';
      preventAuthorEditing(scope.index);
    } else {
      if (model.submit(null, null, scope.book)) {
        scope.book.button='<img class="loading" src="images/loading.gif">';
      }
    }
  },

  calculatePrice(event, scope) {
    var mod=scope.book||scope.inputs;
    mod.price.hbk=(parseFloat(this.value)+3)+"";
    mod.price.ebk=((Math.ceil(parseFloat(this.value))/2)-0.01)+"";
  },

  calculatePriceFromPages(event, scope) {
    var mod=scope.book||scope.inputs,
        pageRange={
          "000-089": "8.99",
          "090-128": "9.99",
          "129-160": "10.99",
          "161-192": "11.99",
          "193-999": "12.99"
        },
        getRange=function(pages) {
          var pp=parseInt(pages,10);
          return Object.keys(pageRange).find(range =>
            pp >= parseInt(range.substr(0,3),10) &&
            pp <= parseInt(range.substr(4,3),10));
        };
    if (!mod.price.pbk || parseFloat(mod.price.pbk) < 13) {
      mod.price.pbk=mod.pages ? pageRange[getRange(mod.pages)] : "";
      mod.price.hbk=(parseFloat(mod.price.pbk)+3)+"";
      mod.price.ebk=((Math.ceil(parseFloat(mod.price.pbk))/2)-0.01)+"";
    }
  },

  validateISBN() {
    if (this.value.length===13) {
      let ISBNArr=this.value.split('').map(d => {return parseInt(d, 10);}),
          even=0,odd=0,
          checkdigit;
      for (let i=0;i<6;i++) {
        even+=ISBNArr[2*i];
        odd+=ISBNArr[2*i+1]*3;
      }
      checkdigit=(10-(even+odd)%10)%10;
      if (ISBNArr[12]!=checkdigit) {
        this.classList.add('invalid');
      }
      else {
        this.classList.remove('invalid');
      }
    } else if (this.value.length>13) {
      this.classList.add('invalid');
    } else if (this.value.length<13) {
      this.classList.remove('invalid');
    }
  },

  currentAuthor: undefined,
  currentAuthorOldName: undefined,
  getCurrentAuthor(name) {
    return this.authors.find(v => v.get('name')===name);
  },
  showAuthorModal(event, scope) {
    // if (!scope.book.isEditing()) {
    if (this.readOnly) {
      model.currentAuthor = model.getCurrentAuthor(scope.author.name);
      model.currentAuthorOldName = model.currentAuthor.get('name');
      authorOverlay.classList.add('modal-in');
    }
  },
  closeAuthorModal(event) {
    if (this===event.target) {
      model.isEditingAuthor=false;
      model.authorButton='Edit';
      authorOverlay.classList.remove('modal-in');
    }
  },
  isEditingAuthor: false,
  authorButton: 'Edit',
  editAuthor(event) {
    var isEditing=model.authorButton==='Save';
    model.authorButton=isEditing?'<img class="loading" src="images/loading.gif">':'Save';
    model.isEditingAuthor=!isEditing;
    if (isEditing) {
      model.currentAuthor.save().then(res => {
        var parseAuthorNewName = res.get('name');
        console.log(model.currentAuthorOldName, '>', parseAuthorNewName);
        model.authorButton='Edit';
        model.books.forEach(book => {
          book.authors.filter(a => a.name === model.currentAuthorOldName).forEach(author => {
            author.name = parseAuthorNewName;
            console.log(author.name);
          });
        });
      }).fail(console.log);
    }
  },
  removeAuthor(event, scope) {
    var x=scope.book.authors.splice(scope.index, 1);
    console.log(x.name);
    // TODO roles
  },
  currentBook: undefined,
  getCurrentBook(title) {
    return this.parseBooks.find(v => v.get('title')===title);
  },
  showNotesModal(event, scope) {
    model.currentBook=model.getCurrentBook(scope.book.title);
    notesOverlay.classList.add('modal-in');
  },
  closeNotesModal(event) {
    if (this===event.target) {
      model.isEditingNotes=false;
      model.notesButton='Edit';
      notesOverlay.classList.remove('modal-in');
    }
  },
  isEditingNotes: false,
  notesButton: 'Edit',
  editNotes(event) {
    var isEditing=model.notesButton==='Save';
    model.notesButton=isEditing?'<img class="loading" src="images/loading.gif">':'Save';
    model.isEditingNotes=!isEditing;
    if (isEditing) {
      model.currentBook.save().then(res => {
        model.notesButton='Edit';
      }).fail(console.log);
    }
  },
  downloadAI(event, scope) {
    var book=scope.book,
        swapNames=function(authorObj) {
          var name=authorObj.name,
              sep=name.indexOf(','),
              ln=name.substring(0, sep),
              fn=name.substring(sep+1).trim();
          return `${fn} ${ln}`;
        },
        stringify=function(array) {
          return {
            '0': 'Unknown',
            '1': array[0],
            '2': array.join(' and '),
            '3+': array.slice(0,-1).join(', ')+' and '+array.slice(-1)
          }[array.length < 3 ? array.length +'' : '3+'];
        },
        authors=book.authors.filter(author => author.roles.author).map(swapNames),
        authorString=`by ${stringify(authors)}`,
        translators=book.authors.filter(author => author.roles.translator).map(swapNames),
        translatorString=translators.length ?
          `, translated by ${stringify(translators)}` :
          '',
        editors=book.authors.filter(author => author.roles.editor).map(swapNames),
        editorString=editors.length ?
          `, edited by ${stringify(editors)}` :
          '',
        introducers=book.authors.filter(author => author.roles.introducer).map(swapNames),
        introducerString=introducers.length ?
          `, introduced by ${stringify(introducers)}` :
          '',
        bios=book.authors.map(author => model.getCurrentAuthor(author.name))
          .filter(parseAuthor => parseAuthor.has('biog'))
          .map(parseAuthor => parseAuthor.get('biog')).join('\r\n\r\n'),
        AI=
`${book.title}\r\n
${authorString}${translatorString}${editorString}${introducerString}\r\n
\r\n
\r\n
About the Book\r\n
\r\n
${book.shortdesc}\r\n
\r\n
\r\n
About the Author(s)\r\n
\r\n
${bios}\r\n
\r\n
\r\n
Bibliographic Details\r\n
\r\n
${book.ISBNs.pbk ? `${formatISBN(book.ISBNs.pbk)} pbk £${book.price.pbk || '?'}\r\n` : ''}
${book.ISBNs.hbk ? `${formatISBN(book.ISBNs.hbk)} hbk £${book.price.hbk || '?'}\r\n` : ''}
${book.ISBNs.ebk ? `${formatISBN(book.ISBNs.ebk)} ebk £${book.price.ebk || '?'}\r\n` : ''}
${book.pages ? `${book.pages}pp\r\n` : ''}
Publication Date: ${(new Date(book.pubdate)).toDateString()}`,
        blob=new Blob([AI], {type: "text/plain;charset=utf-8"});
    saveAs(blob, `${book.title} AI.txt`);
  },
  smartSearch(event, scope) {
    var column=this.getAttribute('data-search-column');
    for (var i=0;i<model.books.length;i++) {
      let book=model.books[i],
          item=book[column];
      if ('string'===typeof item) {
        book.filterOut=!item.toLowerCase().includes(this.value.toLowerCase());
      } else if (column==='authors') {
        book.filterOut=item.every(v => !v.name.toLowerCase().includes(this.value.toLowerCase()));
      } else if (column==='ISBNs' || column==='price') {
        book.filterOut=Object.keys(item).every(k => !item[k].includes(this.value));
      } else if (!item) {
        book.filterOut=true;
      }
    }
    if (this.value) {this.classList.add('warning');}
    else {this.classList.remove('warning');}
  },
  openFilesCover(event, scope) {
    this.parentNode.querySelector('input[type=file]').click();
  },
  coverSelected(event, scope) {
    scope.book.cover_orig = this.files[0];
  },
  // initRow() {
  //   var i=this.index;
  //   setTimeout(function() {
  //     var dz=new Dropzone(bookRows[i]);
  //   }, 200);
  // },
  // alertMe() {
  //   console.log(arguments);
  // },
  menu() {
    // var loadFile=function(url,callback){
    //     JSZipUtils.getBinaryContent(url,callback);
    // };
    // loadFile("examples/tagExample.docx", function(err,content) {
    //     if (err) {throw err;}
    //     doc=new Docxgen(content);
    //     doc.setData({
    //       "first_name":"Hipp",
    //       "last_name":"Edgar",
    //       "phone":"0652455478",
    //       "description":"New Website"
    //     }); //set the templateVariables
    //     doc.render(); //apply them (replace all occurences of {first_name} by Hipp, ...)
    //     out=doc.getZip().generate({type:"blob"}); //Output the document using Data-URI
    //     saveAs(out,"output.docx");
    // });
  }
};

rivets.bind(document.body, model);
update();
