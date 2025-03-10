import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
};

const theme = extendTheme({
  config,
  styles: {
    global: (props: any) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
        color: props.colorMode === 'dark' ? 'white' : 'gray.800',
      },
    }),
  },
  components: {
    Heading: {
      baseStyle: {
        fontWeight: 'semibold',
      },
    },
    Select: {
      baseStyle: {
        field: {
          borderRadius: 'md',
        },
      },
      defaultProps: {
        size: 'md',
      },
    },
    Text: {
      baseStyle: {
        fontSize: 'md',
      },
    },
    Button: {
      defaultProps: {
        colorScheme: 'blue',
        size: 'md',
      },
    },
    IconButton: {
      defaultProps: {
        colorScheme: 'blue',
        size: 'md',
      },
    },
    Link: {
      baseStyle: (props: any) => ({
        color: props.colorMode === 'dark' ? 'blue.200' : 'blue.600',
        _hover: {
          textDecoration: 'none',
          color: props.colorMode === 'dark' ? 'blue.300' : 'blue.700',
        },
      }),
    },
  },
});

export default theme; 