import type { ReactNode } from "react";
import { ScrollToTopOnMount } from "@/components/ScrollToTopOnMount";

export default function ShippingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){try{if('scrollRestoration' in history)history.scrollRestoration='manual';var d=document.documentElement,b=document.body;d.scrollTop=0;if(b)b.scrollTop=0;window.scrollTo(0,0);}catch(e){}})();",
        }}
      />
      <ScrollToTopOnMount />
      {children}
    </>
  );
}
