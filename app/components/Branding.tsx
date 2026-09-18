import * as React from "react";
import styled from "styled-components";
import { depths, s } from "@shared/styles";

function Branding() {
  return (
    <Container>
      <Logo src="/images/maki-icon.svg" alt="MAKI" />
      &nbsp;MAKI
    </Container>
  );
}

const Container = styled.div`
  justify-content: center;
  padding-bottom: 16px;

  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  border-top-right-radius: 2px;
  color: ${s("text")};
  display: flex;
  align-items: center;

  z-index: ${depths.sidebar + 1};
  background: ${s("sidebarBackground")};
  position: fixed;
  bottom: 0;
  right: 0;
  padding: 16px;

`;

const Logo = styled.img`
  width: 20px;
  height: 20px;
`;

export default React.memo(Branding);
