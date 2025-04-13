import { scoringKey } from '@/app/utils'
import { Body1 } from '@/components/Body1'
import { InfoIcon } from '@chakra-ui/icons'
import { Box, IconButton, Popover, PopoverArrow, PopoverBody, PopoverCloseButton, PopoverContent, PopoverHeader } from '@chakra-ui/react'
import { useState } from 'react'

export const ScoringKeyButton = () => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const openPopover = () => {
    setPopoverOpen(true);
  }
  const closePopover = () => {
    setPopoverOpen(false);
  }

  return (
    <Box>
      <IconButton
        icon={<InfoIcon />}
        aria-label="Scoring Key"
        variant="outline"
        size="sm"
        onClick={openPopover}
      />
      <Popover
        isOpen={popoverOpen}
        onClose={closePopover}
        placement="bottom"
        closeOnBlur={true}
      >
        <PopoverContent>
          <PopoverArrow />
          <PopoverCloseButton />
          <PopoverHeader>Scoring Key</PopoverHeader>
          <PopoverBody>
            {Object.entries(scoringKey).map(([key, value], index) => (
              <Body1 key={index}>
                {key} - {value}
              </Body1>
            ))}
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </Box>
  )
}