import { scoringKey } from '@/app/utils'
import { Body1 } from '@/components/Body1'
import { Info } from "lucide-react";
import { Box, IconButton, PopoverRoot, PopoverTrigger, PopoverPositioner, PopoverContent, PopoverArrow, PopoverCloseTrigger, PopoverHeader, PopoverBody } from '@chakra-ui/react'

export const ScoringKeyButton = () => {
  return (
    <Box>
      <PopoverRoot>
        <PopoverTrigger asChild>
          <IconButton aria-label="Scoring Key" variant="outline" size="sm">
            <Info size={16} />
          </IconButton>
        </PopoverTrigger>
        <PopoverPositioner>
          <PopoverContent>
            <PopoverArrow />
            <PopoverCloseTrigger />
            <PopoverHeader>Scoring Key</PopoverHeader>
            <PopoverBody>
              {Object.entries(scoringKey).map(([key, value], index) => (
                <Body1 key={index}>
                  {key} - {value}
                </Body1>
              ))}
            </PopoverBody>
          </PopoverContent>
        </PopoverPositioner>
      </PopoverRoot>
    </Box>
  )
}