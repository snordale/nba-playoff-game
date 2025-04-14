'use client'; // Required for class components with lifecycle methods in Next.js App Router

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Heading, Text, Button, VStack } from '@chakra-ui/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service here
    // For now, we'll just log it to the console
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    // Attempt to reset the state by forcing a re-render or navigation
    // Simple approach: reload the page
    window.location.reload();
    // More sophisticated approaches might involve resetting specific app state
    // or navigating the user to a safe page.
    // this.setState({ hasError: false }); // Only use if the error source is cleared
  };

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <Box textAlign="center" py={10} px={6}>
          <Heading
            display="inline-block"
            as="h2"
            size="2xl"
            bgGradient="linear(to-r, orange.400, orange.600)"
            backgroundClip="text">
            Oops!
          </Heading>
          <Text fontSize="18px" mt={3} mb={2}>
            Something went wrong
          </Text>
          <Text color={'gray.500'} mb={6}>
            An unexpected error occurred in the application. Please try refreshing the page.
          </Text>

          <Button
            colorScheme="orange"
            bgGradient="linear(to-r, orange.400, orange.500, orange.600)"
            color="white"
            variant="solid"
            onClick={this.handleReset}>
            Refresh Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}