import {
  Box,
  Button,
  Input,
  VStack,
  Text,
  Link,
  HStack,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import React from "react";
import { useAppState } from "../../state/store";

type SetAPIKeyProps = {
  asInitializerView?: boolean;
  initialGeminiKey?: string;
  onClose?: () => void;
};

const SetAPIKey = ({
  asInitializerView = false,
  initialGeminiKey = "",
  onClose,
}: SetAPIKeyProps) => {
  const { updateSettings } = useAppState((state) => ({
    updateSettings: state.settings.actions.update,
  }));

  const [geminiKey, setGeminiKey] = React.useState(initialGeminiKey || "");
  const [showPassword, setShowPassword] = React.useState(false);

  const onSave = () => {
    updateSettings({
      geminiKey,
    });
    onClose && onClose();
  };

  return (
    <VStack spacing={4}>
      <Text fontSize="sm">
        Anda memerlukan Google Gemini API Key untuk menjalankan weblify.id.
        Jika Anda belum memiliki API key, Anda dapat membuatnya di{" "}
        <Link
          href="https://makersuite.google.com/app/apikey"
          color="blue"
          isExternal
        >
          Google AI Studio
        </Link>
        .
        <br />
        <br />
        weblify.id menyimpan API key Anda secara lokal di perangkat Anda, dan hanya digunakan
        untuk berkomunikasi dengan Gemini API.
      </Text>

      <FormControl>
        <FormLabel>Gemini API Key</FormLabel>
        <HStack w="full">
          <Input
            placeholder="Masukkan Gemini API Key"
            value={geminiKey}
            onChange={(event) => setGeminiKey(event.target.value)}
            type={showPassword ? "text" : "password"}
          />
          {asInitializerView && (
            <Button
              onClick={() => setShowPassword(!showPassword)}
              variant="outline"
            >
              {showPassword ? "Hide" : "Show"}
            </Button>
          )}
        </HStack>
      </FormControl>

      <Button
        onClick={onSave}
        w="full"
        isDisabled={!geminiKey}
        colorScheme="blue"
      >
        Simpan
      </Button>
    </VStack>
  );
};

export default SetAPIKey;
