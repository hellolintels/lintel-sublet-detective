
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false)
  
  React.useEffect(() => {
    // Initial check
    checkIfMobile()
    
    // Set up event listener for resize
    window.addEventListener("resize", checkIfMobile)
    
    // Clean up
    return () => window.removeEventListener("resize", checkIfMobile)
  }, [])
  
  function checkIfMobile() {
    const width = window.innerWidth || 
                  document.documentElement.clientWidth || 
                  document.body.clientWidth
    setIsMobile(width < MOBILE_BREAKPOINT)
  }

  return isMobile
}
