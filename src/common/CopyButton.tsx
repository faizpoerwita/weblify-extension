import React from "react";
import { CopyIcon } from "@chakra-ui/icons";
import { useToast, Tooltip } from "@chakra-ui/react";
import { callRPC } from "../helpers/rpc/pageRPC";

interface CopyButtonProps {
  text: string;
  displayText?: React.ReactNode;
  tooltipLabel?: string;
}

export default function CopyButton(props: CopyButtonProps) {
  const toast = useToast();
  const { text, displayText, tooltipLabel = "Salin ke clipboard" } = props;

  return (
    <Tooltip label={tooltipLabel} placement="top" hasArrow>
      <CopyIcon
        cursor="pointer"
        color="gray.500"
        _hover={{ color: "gray.700" }}
        onClick={async (event) => {
          try {
            event.preventDefault();
            await callRPC("copyToClipboard", [text]);
            toast({
              title: "Disalin ke clipboard",
              status: "success",
              duration: 3000,
              isClosable: true,
            });
          } catch (e) {
            console.error(e);
            toast({
              title: "Error",
              description: "Tidak dapat menyalin ke clipboard",
              status: "error",
              duration: 5000,
              isClosable: true,
            });
          }
        }}
      />
    </Tooltip>
  );
}
