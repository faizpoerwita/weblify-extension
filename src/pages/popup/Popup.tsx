import React from "react";
import logo from "@assets/img/logo.svg";
import "@pages/popup/Popup.css";
import useStorage from "@src/shared/hooks/useStorage";
import exampleThemeStorage from "@src/shared/storages/exampleThemeStorage";
import withSuspense from "@src/shared/hoc/withSuspense";
import withErrorBoundary from "@src/shared/hoc/withErrorBoundary";
import { Global, css } from "@emotion/react";

const Popup = () => {
  const theme = useStorage(exampleThemeStorage);
  const isDark = theme === "dark";

  return (
    <div className="App" style={{
      background: isDark 
        ? "linear-gradient(165deg, rgba(15,25,40,0.95) 0%, rgba(25,35,60,0.95) 40%, rgba(35,45,80,0.95) 60%, rgba(45,55,100,0.95) 100%)"
        : "linear-gradient(165deg, rgba(224,249,255,0.95) 0%, rgba(179,229,252,0.95) 40%, rgba(144,216,249,0.95) 60%, rgba(99,205,247,0.95) 100%)",
      backdropFilter: "blur(8px)",
      transition: "all 0.4s ease",
    }}>
      {/* Global styles for animations */}
      <Global 
        styles={css`
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
            100% { opacity: 0.6; transform: scale(1); }
          }
          
          @keyframes float {
            0% { transform: translate(0, 0); }
            50% { transform: translate(2px, 4px); }
            100% { transform: translate(0, 0); }
          }

          @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}
      />

      {/* Animated light effect */}
      <div className="light-effect" style={{
        position: "absolute",
        top: "0",
        left: "0",
        right: "0",
        bottom: "0",
        background: `radial-gradient(circle at 50% 50%, ${isDark ? "rgba(99,179,237,0.1)" : "rgba(99,179,237,0.2)"} 0%, transparent 70%)`,
        opacity: "0.7",
        animation: "rotate 30s linear infinite",
        zIndex: "0",
      }}></div>

      <header className="App-header" style={{ 
        color: isDark ? "#e2e8f0" : "#2d3748",
        zIndex: "1",
        position: "relative",
      }}>
        <div className="frosted-container">
          <div className="logo-container">
            <img 
              src={logo} 
              className="App-logo" 
              alt="logo" 
              style={{
                animation: "pulse 4s infinite ease-in-out",
                filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))",
                transition: "transform 0.3s ease",
              }}
            />
          </div>
          
          <div className="App-title">
            <span className="App-title-emoji" style={{
              animation: "float 3s infinite ease-in-out",
              display: "inline-block",
              filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
            }}>🌐</span>
            <span 
              className="App-title-text" 
              style={{
                background: isDark
                  ? "linear-gradient(to right, #90cdf4, #63b3ed)"
                  : "linear-gradient(to right, #2b6cb0, #4299e1)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: "bold",
              }}
            >
              weblify.id
            </span>
          </div>
          
          <div className="App-tagline" style={{ 
            color: isDark ? "#a0aec0" : "#4a5568",
            animation: "fadeIn 0.8s ease-out",
            fontWeight: "500",
            letterSpacing: "0.2px",
          }}>
            From Browsing to Automation
          </div>
          
          <button
            className="App-button"
            style={{
              background: isDark 
                ? "linear-gradient(135deg, #4299e1 0%, #63b3ed 100%)" 
                : "linear-gradient(135deg, #3182ce 0%, #4299e1 100%)",
              color: "white",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              boxShadow: "0 4px 12px rgba(66, 153, 225, 0.2)",
              transform: "translateY(0)",
              transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            }}
            onClick={exampleThemeStorage.toggle}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(66, 153, 225, 0.25)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(66, 153, 225, 0.2)";
            }}
          >
            {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          </button>
        </div>
      </header>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div>Loading...</div>), <div>Error Occurred</div>);
