import { useEffect, useState } from "react";
// src: https://stackoverflow.com/questions/36862334/get-viewport-window-height-in-reactjs

export interface WindowProps {
  width: number;
  height: number;
}
function getWindowSize() {
  if (typeof window === "undefined") {
    return {
      width: 0,
      height: 0,
    };
  }

  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height,
  };
}

export function useWindowSize(): WindowProps {
  const [windowSize, setWindowSize] = useState(getWindowSize());

  useEffect(() => {
    function handleResize() {
      setWindowSize(getWindowSize());
    }

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}
