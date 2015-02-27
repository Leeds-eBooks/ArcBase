Parse.initialize(ArcBase.keys.Parse.a,ArcBase.keys.Parse.b);
var table=document.querySelector('#main table'),
    Book=Parse.Object.extend("Book"),
    Author=Parse.Object.extend("Author"),
    notesOverlay=document.querySelector('.notes-overlay'),
    authorOverlay=document.querySelector('.author-overlay'),
    authorModal=document.querySelector('.author-modal'),
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
  return v.replace(/\W+/g,'-');
};

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

function update(newBook) {
  var query=new Parse.Query(Book);
  if (newBook) {query.equalTo('objectId',newBook.id);}
  query.limit(1000).include('authors').descending('pubdate').find().then(function(results) {
    results.forEach(v => {
      var existingBook=model.books.find(book => book.id===v.id);
      model.parseBooks.pushUnique(v);
      if (v.has('authors')) {v.get('authors').forEach(author => {
        model.authors.pushUnique(author);
      });}
      if (existingBook) {
        existingBook.id=v.id;
        existingBook.title=v.get('title');
        existingBook.authors=(v.get('authors') && v.get('authors').map(authorMapper,v)) || [];
        existingBook.pubdate=v.get('pubdate');
        existingBook.shortdesc=v.get('shortdesc');
        existingBook.ISBNs=v.get('ISBNs') && v.get('ISBNs').reduce((obj, current) => {
          obj[current.type]=current.value;
          return obj;
        }, {});
        existingBook.price=(v.get('price') && v.get('price').reduce((obj, current) => {
          obj[current.type]=current.value;
          return obj;
        }, {})) || {pbk:'',hbk:'',ebk:''};
        existingBook.button='Edit';
      } else {
        let method=results.length>1 ? 'push' : 'unshift';
        model.books[method]({
          id: v.id,
          title: v.get('title'),
          authors: (v.get('authors') && v.get('authors').map(authorMapper,v)) || [],
          pubdate: v.get('pubdate'),
          shortdesc: v.get('shortdesc'),
          ISBNs: v.get('ISBNs') && v.get('ISBNs').reduce((obj, current) => {
            obj[current.type]=current.value;
            return obj;
          }, {}),
          price: (v.get('price') && v.get('price').reduce((obj, current) => {
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
                introducer: false
              }
            });
          },
          isEditing() {
            return this.button==='Save';
          },
        });
      }
    });
    if (newBook) {
      /* clear inputs */
      model.inputs={
        title: '',
        authors: [{
          name:'',
          roles: {
            author: false,
            translator: false,
            editor: false,
            introducer: false
          }
        }],
        pubdate: '',
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
  }).fail(function(err) {
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
      success: update,
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
        introducer: false
      }
    }],
    pubdate: '',
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
        introducer: false
      }
    });
  },

  submit(event, modelArg, bookToEdit) {
    var data={},
        inputModel=bookToEdit||model.inputs,
        tempInput,tempKey,authors=[],replacedAuthorMap={};
    function continueSubmit(replacedAuthors) {
      if (!inputModel.title.trim()) {
        alert('Every book needs a title...');
        return false;
      } else if (inputModel.authors.some(v => v.name.trim() && !~v.name.indexOf(','))) {
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
          } else {
            if ('function'!==typeof tempInput && tempKey!=='button' && tempKey!=='filterOut') {
              data[tempKey]=tempInput && tempInput.trim().replace(/\s{1,}/g,' ');
            }
          }
        }
        getParseAuthors(authors).then(function(returnedAuthors) {
          data.authors=returnedAuthors;
          data.roleMap=[];
          returnedAuthors.forEach(author => {
            var roleModel=inputModel.authors.find(a => a.name===author.get('name')),
                roles=roleModel ? roleModel.roles : replacedAuthorMap[author.get('name')].roles;
            data.roleMap.push({
              id: author.id,
              roles
            });
          });
          saveToParse(data, bookToEdit);
        });
        return true;
      }
    }

    return Parse.Cloud.run('checkAuthors',{authors: inputModel.authors}).then(res => {
      var cancelFlag=false;
      var replaced=res.filter(r => {
        console.log(r);
        if (r.length===1) {
          return confirm("Did you mean "+r[0].author.get("name")+"?\n\nOk for YES, I MADE A MISTAKE\nCancel for NO, I AM CORRECT");
        } else {
          cancelFlag=confirm("There is an author with a similar name on the database already. If there's a typo, do you want to go back and fix it?\n\nOk for YES, I MADE A MISTAKE\nCancel for NO, I AM CORRECT");
          return cancelFlag;
        }
      });
      if (replaced.length) {
        if (!cancelFlag) continueSubmit(replaced);
      } else continueSubmit();
    }).fail(function() {continueSubmit();});
  },

  editOrSubmit(event, scope) {
    if (scope.book.button==='Edit') {
      scope.book.button='Save';
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
  getCurrentAuthor(name) {
    return this.authors.find(v => v.get('name')===name);
  },
  showAuthorModal(event, scope) {
    if (!scope.book.isEditing()) {
      model.currentAuthor=model.getCurrentAuthor(scope.author.name);
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
        model.authorButton='Edit';
      }).fail(console.log);
    }
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
  smartSearch(event, scope) {
    var column=this.getAttribute('data-search-column');
    for (var i=0;i<model.books.length;i++) {
      let book=model.books[i],
          item=book[column];
      if ('string'===typeof item) {
        book.filterOut=!~item.toLowerCase().indexOf(this.value.toLowerCase());
      } else if (column==='authors') {
        book.filterOut=item.every(v => !~v.name.toLowerCase().indexOf(this.value.toLowerCase()));
      } else if (column==='ISBNs' || column==='price') {
        book.filterOut=Object.keys(item).every(k => !~item[k].indexOf(this.value));
      } else if (!item) {
        book.filterOut=true;
      }
    }
    if (this.value) {this.classList.add('warning');}
    else {this.classList.remove('warning');}
  },
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
