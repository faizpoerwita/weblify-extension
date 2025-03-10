import {
  Link,
  Box,
  ChakraProvider,
  Heading,
  HStack,
  IconButton,
  Icon,
} from "@chakra-ui/react";
import { SettingsIcon } from "@chakra-ui/icons";
import { FaDiscord, FaGithub } from "react-icons/fa6";
import { useState } from "react";
import { useAppState } from "../state/store";
import SetAPIKey from "./settings/SetAPIKey";
import TaskUI from "./TaskUI";
import Settings from "./Settings";

const App = () => {
  const hasAPIKey = useAppState((state) => state.settings.geminiKey);
  const [inSettingsView, setInSettingsView] = useState(false);

  return (
    <ChakraProvider>
      <Box p="8" pb="24" fontSize="lg" w="full">
        <HStack mb={4} alignItems="center">
          <Heading as="h1" size="lg" flex={1}>
            weblify.id
          </Heading>
          {hasAPIKey && (
            <IconButton
              icon={<SettingsIcon />}
              onClick={() => setInSettingsView(true)}
              aria-label="open settings"
            />
          )}
        </HStack>
        {hasAPIKey ? (
          inSettingsView ? (
            <Settings setInSettingsView={setInSettingsView} />
          ) : (
            <TaskUI />
          )
        ) : (
          <SetAPIKey asInitializerView />
        )}
      </Box>
      <Box
        px="8"
        pos="fixed"
        w="100%"
        bottom={0}
        py={4}
        borderTop="1px"
        borderColor="gray.200"
        bg="white"
      >
        <HStack justify="center" spacing={4}>
          <Link
            href="https://github.com/normal-computing/fuji-web"
            isExternal
            display="flex"
            alignItems="center"
          >
            <Icon as={FaGithub} mr={2} />
            GitHub
          </Link>
          <Link
            href="https://discord.gg/NxCe2CXXGU"
            isExternal
            display="flex"
            alignItems="center"
          >
            <Icon as={FaDiscord} mr={2} />
            Join Our Discord
          </Link>
        </HStack>
      </Box>
    </ChakraProvider>
  );
};

export default App;
