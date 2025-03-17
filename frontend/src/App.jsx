import { gql, useSubscription } from "@apollo/client";
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

const App = () => {
  const [page, setPage] = useState("authors");
  const [token, setToken] = useState(null);

  useSubscription(BOOK_ADDED, {
    onData: ({ data }) => {
      window.alert(`Book added: ${data.data.bookAdded.title}`);
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
