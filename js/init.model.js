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

    // submit() -->
    if (!inputModel.title.trim()) {
      alert('Every book needs a title...');
      return false;
    } else if (inputModel.authors.some(v => v.name.trim() && !v.name.includes(','))) {
      alert('Author names must be Lastname, Firstname');
      return false;
    } else {

      return Parse.Cloud.run('checkAuthors', {authors: inputModel.authors})
      .then(res => {
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
    }
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
  calculateCurrentAuthorAge() {
    if (model.currentAuthor && model.currentAuthor.has('dob')) {
      let dob = model.currentAuthor.get('dob'),
          now = new Date();
      return '(Age: ' + Math.floor((now - dob) / 3.15569e10) + ')';
    }
  },
  isEditingAuthor: false,
  authorButton: 'Edit',
  addTravelAvailDateRange(event, scope) {
    model.currentAuthor.addUnique('travel_avail_dates', ['','']);
    model.currentAuthor.change();
  },
  delTravelAvailDateRange(event, scope) {
    var range = model.currentAuthor.get('travel_avail_dates')[scope.index];
    model.currentAuthor.remove('travel_avail_dates', range); // FIXME can't remove() after add() without saving in-between
    model.currentAuthor.change();
  },
  editAuthor(event) {
    var isEditing = model.authorButton === 'Save';
    model.authorButton = isEditing ?
      '<img class="loading" src="images/loading.gif">' : 'Save';
    model.isEditingAuthor =! isEditing;
    if (isEditing) {
      model.currentAuthor.save().then(res => {
        var parseAuthorNewName = res.get('name');
        model.authorButton='Edit';
        model.books.forEach(book => {
          book.authors.filter(a => a.name === model.currentAuthorOldName).forEach(author => {
            author.name = parseAuthorNewName;
          });
        });
      }).fail(console.log);
    }
  },
  removeAuthor(event, scope) {
    var x=scope.book.authors.splice(scope.index, 1);
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
  showLongModal(event, scope) {
    model.currentBook=model.getCurrentBook(scope.book.title);
    longOverlay.classList.add('modal-in');
  },
  closeNotesModal(event) {
    if (this===event.target) {
      model.isEditingNotes=false;
      model.notesButton='Edit';
      notesOverlay.classList.remove('modal-in');
    }
  },
  closeLongModal(event) {
    if (this===event.target) {
      model.isEditingLong=false;
      model.longButton='Edit';
      longOverlay.classList.remove('modal-in');
    }
  },
  isEditingNotes: false,
  isEditingLong: false,
  notesButton: 'Edit',
  longButton: 'Edit',
  editNotes(event) {
    var isEditing = model.notesButton === 'Save';
    model.notesButton = isEditing ? '<img class="loading" src="images/loading.gif">' : 'Save';
    model.isEditingNotes =! isEditing;
    if (isEditing) {
      model.currentBook.save().then(res => {
        model.notesButton='Edit';
      }).fail(console.log);
    }
  },
  editLong(event) {
    var isEditing = model.longButton === 'Save';
    model.longButton = isEditing ? '<img class="loading" src="images/loading.gif">' : 'Save';
    model.isEditingLong =! isEditing;
    if (isEditing) {
      model.currentBook.save().then(res => {
        model.longButton='Edit';
      }).fail(console.log);
    }
  },

  downloadAI(event, scope) {
    var book = scope.book,
        AI = docTemplates.AI(book),
        blob = new Blob([AI], {type: "text/plain;charset=utf-8"});

    saveAs(blob, `${book.title} AI.txt`);
  },

  downloadPR(event, scope) {
    var book = scope.book,
        PR = docTemplates.PR(book),
        blob = new Blob([PR], {type: "text/plain;charset=utf-8"});

    saveAs(blob, `Press Release Arc Publications - ${book.title}.txt`);
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
  }
};

rivetsView = rivets.bind(document.body, model);
update();
