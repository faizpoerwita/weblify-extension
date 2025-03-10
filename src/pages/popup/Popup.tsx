import React from "react";
import logo from "@assets/img/logo.svg";
import "@pages/popup/Popup.css";
import useStorage from "@src/shared/hooks/useStorage";
import exampleThemeStorage from "@src/shared/storages/exampleThemeStorage";
import withSuspense from "@src/shared/hoc/withSuspense";
import withErrorBoundary from "@src/shared/hoc/withErrorBoundary";

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);

  return (
    <div className="App" style={{
      backgroundColor: theme === "light" ? "#fff" : "#282c34",
    }}>
      <header className="App-header" style={{ 
        color: theme === "light" ? "#333" : "#fff",
      }}>
        <img src={logo} className="App-logo" alt="logo" />
        
        <div className="App-title">
          <span className="App-title-emoji">🌐</span>
          <span className="App-title-text">weblify.id</span>
        </div>
        
        <div className="App-tagline" style={{ 
          color: theme === "light" ? "#666" : "#ccc",
        }}>
          From Browsing to Automation
        </div>
        
        <button
          className="App-button"
          style={{
            backgroundColor: theme === "light" ? "#4285f4" : "#34a853",
          }}
          onClick={exampleThemeStorage.toggle}
        >
          {theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        </button>
      </header>
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(Popup, <div> Loading ... </div>),
  <div> Error Occur </div>,
);
