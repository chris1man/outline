import { observer } from "mobx-react";
import { useEffect } from "react";
import useMeasure from "react-use-measure";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Icon from "@shared/components/Icon";
import { HEADER_HEIGHT } from "@shared/constants";
import useShare from "@shared/hooks/useShare";
import Flex from "~/components/Flex";
import Header from "~/components/Header";
import {
  AppearanceAction,
  SubscribeAction,
} from "~/components/Sharing/components/Actions";
import AuthenticatedIsland from "~/components/Sharing/components/AuthenticatedIsland";
import HeaderBranding from "~/components/Sharing/components/HeaderBranding";
import env from "~/env";
import useEditingFocus from "~/hooks/useEditingFocus";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import useWindowScrollbarWidth from "~/hooks/useWindowScrollbarWidth";
import type Document from "~/models/Document";
import PublicBreadcrumb from "./PublicBreadcrumb";
import { SearchHighlightChip } from "./SearchHighlightChip";

type Props = {
  document: Document;
};

function SharedDocumentHeader({ document }: Props) {
  const { shares } = useStores();
  const isMobileMedia = useMobile();
  const isEditingFocus = useEditingFocus();

  // Set CSS variable for header offset (used by sticky table headers)
  useEffect(() => {
    window.document.documentElement.style.setProperty(
      "--header-offset",
      isEditingFocus ? "0px" : `${HEADER_HEIGHT}px`
    );
  }, [isEditingFocus]);

  const [measureRef, size] = useMeasure();
  const scrollbarWidth = useWindowScrollbarWidth() ?? 0;
  const { shareId, sharedTree, allowSubscriptions } = useShare();
  const share = shareId ? shares.get(shareId) : undefined;
  const isMobile = isMobileMedia || (size.width > 0 && size.width < 700);

  if (!shareId) {
    return null;
  }

  const hasSidebar = !!(sharedTree && sharedTree.children?.length);
  return (
    <StyledHeader
      ref={measureRef}
      $hidden={isEditingFocus}
      $scrollbarWidth={scrollbarWidth}
      title={
        <Flex gap={4}>
          {document.icon && (
            <Icon
              value={document.icon}
              initial={document.initial}
              color={document.color ?? undefined}
            />
          )}
          {document.title}
        </Flex>
      }
      hasSidebar={hasSidebar}
      left={
        isMobile ? null : hasSidebar ? (
          <PublicBreadcrumb
            documentId={document.id}
            shareId={shareId}
            sharedTree={sharedTree}
          />
        ) : share ? (
          <HeaderBranding share={share} />
        ) : null
      }
      actions={
        <>
          <SearchHighlightChip />
          {allowSubscriptions !== false && env.EMAIL_ENABLED && (
            <SubscribeAction shareId={shareId} documentId={document.id} />
          )}
          <AppearanceAction />
          <AuthenticatedIsland
            document={document}
            share={share}
            compact={isMobile}
          />
        </>
      }
    />
  );
}

type StyledHeaderProps = {
  $hidden: boolean;
  /** Width of the window scrollbar, which the header end edge falls behind. */
  $scrollbarWidth: number;
};

/**
 * The body spans the full viewport width, so the end of the header falls behind
 * a visible scrollbar. The removed-body-scroll-bar-size variable is set while a
 * modal holds the page scroll, when the scrollbar is momentarily gone, and
 * keeps the padding constant as menus and dialogs open.
 */
const endPadding = (base: number) => (props: StyledHeaderProps) =>
  `calc(${base}px + ${props.$scrollbarWidth}px + var(--removed-body-scroll-bar-size, 0px))`;

const StyledHeader = styled(Header)<StyledHeaderProps>`
  transition: opacity 500ms ease-in-out;
  ${(props) => props.$hidden && "opacity: 0;"}

  /* Doubled to take precedence over the padding shorthand of the header. */
  && {
    padding-right: ${endPadding(16)};

    ${breakpoint("tablet")`
      padding-right: ${endPadding(12)};
    `}
  }
`;

export default observer(SharedDocumentHeader);
