import { gql, useApolloClient, useSubscription } from "@apollo/client";
import { useState } from "react";
import Authors from "./components/Authors";
import Books from "./components/Books";
import Login from "./components/Login";
import NewBook from "./components/NewBook";

export const BOOK_ADDED = gql`
  subscription BookAdded {
    bookAdded {
      title
    }
  }
`;

const ALL_BOOKS = gql`
  query AllBooks {
    allBooks {
      author {
        name
      }
      published
      title
    }
  }
`;

export const updateCache = (cache, query, addedBook) => {
  const uniqByTitle = (a) => {
    let seen = new Set();
    return a.filter((item) => {
      let k = item.title;
      return seen.has(k) ? false : seen.add(k);
    });
  };

  cache.updateQuery(query, (data) => {
    if (!data) {
      return {
        allBooks: [addedBook],
      };
    }
    return {
      allBooks: uniqByTitle(data.allBooks.concat(addedBook)),
    };
  });
};

const App = () => {
  const [page, setPage] = useState("authors");
  const [token, setToken] = useState(null);
  const client = useApolloClient();

  useSubscription(BOOK_ADDED, {
    onData: ({ data }) => {
      const addedBook = data.data.bookAdded;
      window.alert(`Book added: ${data.data.bookAdded.title}`);
      updateCache(client.cache, { query: ALL_BOOKS }, addedBook);
    },
  });

  return (
    <div>
      <div>
        <button onClick={() => setPage("authors")}>authors</button>
        <button onClick={() => setPage("books")}>books</button>
        {token && <button onClick={() => setPage("add")}>add book</button>}
        {!token && <button onClick={() => setPage("login")}>login</button>}
      </div>

      <Authors show={page === "authors"} />

      <Books show={page === "books"} />

      <NewBook show={page === "add"} />

      <Login setToken={setToken} show={page === "login"} />
    </div>
  );
};

export default App;
