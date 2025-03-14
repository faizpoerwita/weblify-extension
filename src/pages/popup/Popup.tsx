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
        ? "linear-gradient(165deg, rgba(15,25,40,0.95) 0%, rgba(25,35,60,0.95) 30%, rgba(35,45,80,0.95) 70%, rgba(45,55,100,0.95) 100%)"
        : "linear-gradient(165deg, rgba(230,245,255,0.95) 0%, rgba(179,229,252,0.95) 30%, rgba(120,190,240,0.95) 70%, rgba(80,160,230,0.95) 100%)",
      backdropFilter: "blur(15px)",
      transition: "all 0.4s ease",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
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
            50% { opacity: 0.9; transform: scale(1.05); }
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
          
          @keyframes gradient-flow {
            0% { background-position: 0% 25%; }
            25% { background-position: 50% 50%; }
            50% { background-position: 100% 75%; }
            75% { background-position: 50% 50%; }
            100% { background-position: 0% 25%; }
          }

          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }

          body {
            margin: 0;
            overflow: hidden;
          }
        `}
      />

      {/* Animated light effect - enhanced */}
      <div className="light-effect" style={{
        position: "absolute",
        top: "0",
        left: "0",
        right: "0",
        bottom: "0",
        background: `radial-gradient(circle at 50% 50%, ${isDark ? "rgba(80,160,230,0.15)" : "rgba(80,160,230,0.25)"} 0%, transparent 70%)`,
        opacity: "0.8",
        animation: "rotate 30s linear infinite",
        zIndex: "0",
      }}></div>
      
      {/* Additional animated blobs - enhanced */}
      <div style={{
        position: "absolute",
        top: "15%",
        left: "10%",
        width: "35%",
        height: "45%",
        opacity: "0.7",
        animation: "float 18s infinite ease-in-out",
        background: `radial-gradient(circle, ${isDark ? "rgba(80,160,230,0.1)" : "rgba(80,160,230,0.15)"} 0%, transparent 70%)`,
        borderRadius: "50%",
        zIndex: "0",
      }}></div>
      
      <div style={{
        position: "absolute",
        bottom: "15%",
        right: "10%",
        width: "40%",
        height: "40%",
        opacity: "0.6",
        animation: "float 22s infinite ease-in-out reverse",
        background: `radial-gradient(circle, ${isDark ? "rgba(100,180,250,0.1)" : "rgba(100,180,250,0.15)"} 0%, transparent 70%)`,
        borderRadius: "50%",
        zIndex: "0",
      }}></div>

      {/* New floating light effect */}
      <div style={{
        position: "absolute",
        top: "30%",
        left: "25%",
        width: "50%",
        height: "40%",
        opacity: "0.5",
        animation: "pulse 8s infinite ease-in-out",
        background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
        borderRadius: "50%",
        zIndex: "0",
      }}></div>

      <header className="App-header" style={{ 
        color: isDark ? "#e2e8f0" : "#2d3748",
        zIndex: "1",
        position: "relative",
        padding: "16px",
        width: "90%",
        maxWidth: "360px",
        animation: "fadeIn 0.6s ease-out"
      }}>
        <div className="frosted-container" style={{
          background: isDark 
            ? "rgba(26, 32, 44, 0.7)" 
            : "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(15px)",
          borderRadius: "24px",
          border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.7)"}`,
          boxShadow: `0 12px 36px ${isDark ? "rgba(0, 0, 0, 0.25)" : "rgba(0, 100, 255, 0.15)"}`,
          padding: "28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s ease",
          transform: "translateZ(0)",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Background decorative effects */}
          <div style={{
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            bottom: "0", 
            opacity: "0.05",
            background: isDark
              ? "radial-gradient(circle at 70% 30%, rgba(99,179,237,0.8) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(66,153,225,0.6) 0%, transparent 60%)"
              : "radial-gradient(circle at 70% 30%, rgba(99,179,237,0.4) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(66,153,225,0.3) 0%, transparent 60%)",
            pointerEvents: "none",
            zIndex: "0"
          }}></div>
          
          <div className="logo-container" style={{
            marginBottom: "16px",
            position: "relative",
            zIndex: "1"
          }}>
            <div style={{
              width: "84px",
              height: "84px",
              borderRadius: "50%",
              background: isDark 
                ? "linear-gradient(135deg, rgba(49, 130, 206, 0.4) 0%, rgba(79, 209, 197, 0.4) 100%)"
                : "linear-gradient(135deg, rgba(235, 248, 255, 0.8) 0%, rgba(49, 130, 206, 0.3) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(0, 100, 255, 0.2)",
              border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.8)"}`,
              animation: "pulse 4s infinite ease-in-out"
            }}>
              <img 
                src={logo} 
                className="App-logo" 
                alt="logo" 
                style={{
                  filter: "drop-shadow(0 6px 8px rgba(0, 0, 0, 0.15))",
                  transition: "transform 0.3s ease",
                  width: "56px",
                  height: "56px",
                }}
              />
            </div>
          </div>
          
          <div className="App-title" style={{
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            position: "relative",
            zIndex: "1"
          }}>
            <span className="App-title-emoji" style={{
              animation: "float 3s infinite ease-in-out",
              display: "inline-block",
              filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
              fontSize: "24px"
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
                fontSize: "1.7rem",
                letterSpacing: "-0.02em",
              }}
            >
              weblify.id
            </span>
          </div>
          
          <div className="App-tagline" style={{ 
            color: isDark ? "#a0aec0" : "#2c5282",
            animation: "fadeIn 0.8s ease-out",
            fontWeight: "500",
            letterSpacing: "0.02em",
            marginBottom: "24px",
            fontSize: "1rem",
            textAlign: "center",
            position: "relative",
            zIndex: "1"
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
              backdropFilter: "blur(15px)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              boxShadow: `0 8px 20px ${isDark ? "rgba(0, 0, 0, 0.3)" : "rgba(66, 153, 225, 0.35)"}`,
              borderRadius: "30px",
              padding: "12px 28px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.95rem",
              letterSpacing: "0.01em",
              transform: "translateY(0)",
              transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              width: "100%",
              position: "relative",
              zIndex: "1"
            }}
            onClick={exampleThemeStorage.toggle}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = `0 12px 28px ${isDark ? "rgba(0, 0, 0, 0.35)" : "rgba(66, 153, 225, 0.45)"}`;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = `0 8px 20px ${isDark ? "rgba(0, 0, 0, 0.3)" : "rgba(66, 153, 225, 0.35)"}`;
            }}
          >
            {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          </button>

          {/* Animated notification badge */}
          <div style={{
            marginTop: "20px",
            padding: "10px 16px",
            borderRadius: "12px",
            background: isDark 
              ? "rgba(255, 255, 255, 0.1)" 
              : "rgba(66, 153, 225, 0.1)",
            border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(66, 153, 225, 0.2)"}`,
            fontSize: "0.8rem",
            color: isDark ? "#a0aec0" : "#2c5282",
            textAlign: "center",
            width: "100%",
            position: "relative",
            zIndex: "1",
            transition: "all 0.3s ease",
            animation: "fadeIn 1s ease-out"
          }}>
            <div style={{
              display: "inline-block", 
              marginRight: "5px",
              animation: "pulse 2s infinite ease-in-out"
            }}>
              ✨
            </div>
            Klik pada ikon ekstensi untuk akses cepat dan mudah
          </div>
        </div>
      </header>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div>Loading...</div>), <div>Error Occured</div>);
