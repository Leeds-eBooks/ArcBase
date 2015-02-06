"use strict";

Parse.initialize(ArcBase.keys.Parse.a, ArcBase.keys.Parse.b);
var table = document.querySelector("#main table"),
    Book = Parse.Object.extend("Book"),
    Author = Parse.Object.extend("Author"),
    model;

function update(newBook) {
  var query = new Parse.Query(Book);
  if (newBook) {
    query.equalTo("objectId", newBook.id);
  }
  query.include("authors").find().then(function (results) {
    results.forEach(function (v) {
      var existingBook = model.books.find(function (book) {
        return book.id === v.id;
      });
      if (existingBook) {
        existingBook.id = v.id;
        existingBook.title = v.get("title");
        existingBook.authors = v.get("authors") && v.get("authors").map(function (v) {
          return v.get("name");
        });
        existingBook.ISBNs = v.get("ISBNs") && v.get("ISBNs").reduce(function (obj, current) {
          obj[current.type] = current.value;
          return obj;
        }, {});
        existingBook.button = "Edit";
      } else {
        model.books.push({
          id: v.id,
          title: v.get("title"),
          authors: v.get("authors") && v.get("authors").map(function (v) {
            return v.get("name");
          }),
          ISBNs: v.get("ISBNs") && v.get("ISBNs").reduce(function (obj, current) {
            obj[current.type] = current.value;
            return obj;
          }, {}),
          button: "Edit"
        });
      }
    });
  }).fail(function (err) {
    console.log(JSON.stringify(err));
  });
}

function saveToParse(data, authorRelations, bookToEdit) {
  var query = new Parse.Query(Book),
      book = bookToEdit ? query.get(bookToEdit.id) : new Book();

  function save(book) {
    book.save(data, {
      success: update,
      error: function (book, error) {
        console.error(JSON.stringify(error));
      }
    });
  }
  console.log(bookToEdit);

  if (bookToEdit) {
    book.then(save);
  } else {
    save(book);
  }
}

function getParseAuthors(authorsArray) {
  return new Promise(function (resolve, reject) {
    var query = new Parse.Query(Author);
    query.containedIn("name", authorsArray);
    query.find({
      success: function (res) {
        var savedAuthorNames = res.map(function (v) {
          return v.get("name");
        }),
            promisedAuthors;
        if (savedAuthorNames.length !== authorsArray.length) {
          promisedAuthors = authorsArray.map(function (v) {
            if (! ~savedAuthorNames.indexOf(v)) {
              var newAuthor = new Author();
              return newAuthor.save({ name: v });
            } else {
              return res.find(function (w) {
                return w.get("name") === v;
              });
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

model = {
  books: [],
  inputs: {
    title: "",
    authors: "",
    ISBNs: {
      pbk: "",
      hbk: "",
      ebk: ""
    }
  },
  selectAll: function selectAll() {
    if (this.readOnly) {
      this.select();
    }
  },
  // selectISBN() {
  //   this.setSelectionRange(5,19);
  // },
  submit: function submit(event, modelArg, bookToEdit) {
    // TODO improve!
    var data = {},
        inputModel = bookToEdit || model.inputs,
        tempInput,
        tempKey,
        authors = [];

    function addToAuthors(v) {
      authors.push(v.trim());
    }

    for (var key in inputModel) {
      tempInput = inputModel[key];
      tempKey = key;

      if (tempKey === "authors") {
        if (bookToEdit) {
          tempInput.forEach(addToAuthors);
        } else {
          tempInput.split(";").forEach(addToAuthors);
        }
      } else if (tempKey === "ISBNs") {
        data.ISBNs = Object.keys(tempInput).map(function (v) {
          return { type: v, value: tempInput[v].replace(/\D+/g, "") };
        });
      } else {
        data[tempKey] = tempInput;
      }
    }
    getParseAuthors(authors).then(function (returnedAuthors) {
      data.authors = returnedAuthors;
      saveToParse(data, returnedAuthors, bookToEdit);
    });
  },
  editOrSubmit: function editOrSubmit(event, scope) {
    if (scope.book.button === "Edit") {
      scope.book.button = "Submit";
      setReadOnly(this.parentNode.parentNode.querySelectorAll("input"), false);
    } else {
      model.submit(null, null, scope.book); // TODO improve!
      scope.book.button = "&hellip;";
      setReadOnly(this.parentNode.parentNode.querySelectorAll("input"), true);
    }
  } };
function setReadOnly(ElementList, bool) {
  Array.from(ElementList).forEach(function (v) {
    v.readOnly = bool;
  });
}

rivets.bind(document.body, model);
update();
