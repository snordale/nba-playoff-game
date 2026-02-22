import { useState, useRef, useEffect } from 'react';
import {
    Input,
    ListRoot,
    ListItem,
    Box,
    InputGroup,
    InputElement,
    Spinner,
} from '@chakra-ui/react';
import { X } from "lucide-react";

export interface TypeaheadOption {
    id: string;
    label: string; // The text displayed in the dropdown
}

interface TypeaheadInputProps {
    options: TypeaheadOption[];
    placeholder?: string;
    isLoading?: boolean;
    onSelect: (option: TypeaheadOption | null) => void; // Callback when an option is selected or cleared
    value?: TypeaheadOption | null; // Controlled value (optional)
    label?: string // For accessibility
}

export const TypeaheadInput = ({
    options,
    placeholder = "Search...",
    isLoading = false,
    onSelect,
    value,
    label = "Typeahead input"
}: TypeaheadInputProps) => {
    const [inputValue, setInputValue] = useState('');
    const [filteredOptions, setFilteredOptions] = useState<TypeaheadOption[]>([]);
    const [showOptions, setShowOptions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number>(-1); // For keyboard navigation
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (value) {
            setInputValue(value.label);
            setShowOptions(false);
        } else {
            setInputValue('');
        }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const term = e.target.value;
        setInputValue(term);
        setSelectedIndex(-1); // Reset keyboard selection

        if (term) {
            const lowerTerm = term.toLowerCase();
            setFilteredOptions(
                options.filter(option =>
                    option.label.toLowerCase().includes(lowerTerm)
                )
            );
            setShowOptions(true);
        } else {
            setFilteredOptions([]);
            setShowOptions(false);
            onSelect(null); // Clear selection if input is cleared manually
        }
    };

    const handleOptionClick = (option: TypeaheadOption) => {
        onSelect(option);
        setInputValue(option.label);
        setShowOptions(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showOptions || filteredOptions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredOptions.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0) {
                    handleOptionClick(filteredOptions[selectedIndex]);
                }
                break;
            case 'Escape':
                setShowOptions(false);
                break;
        }
    };

    // Scroll list item into view on keyboard navigation
    useEffect(() => {
        if (selectedIndex >= 0 && listRef.current) {
            const selectedItem = listRef.current.children[selectedIndex] as HTMLLIElement;
            selectedItem?.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    // Handle clicks outside to close the dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                inputRef.current && !inputRef.current.contains(event.target as Node) &&
                listRef.current && !listRef.current.contains(event.target as Node)
            ) {
                setShowOptions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleClear = () => {
        setInputValue('');
        setFilteredOptions([]);
        setShowOptions(false);
        onSelect(null);
        inputRef.current?.focus();
    };

    return (
        <Box position="relative">
            <InputGroup
                endElement={
                    isLoading ? (
                        <InputElement placement="end">
                            <Spinner size="sm" />
                        </InputElement>
                    ) : inputValue ? (
                        <InputElement placement="end">
                            <button
                                type="button"
                                onClick={handleClear}
                                aria-label="Clear input"
                                style={{ cursor: 'pointer', color: 'var(--chakra-colors-gray-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', padding: 0 }}
                            >
                                <X size={16} />
                            </button>
                        </InputElement>
                    ) : undefined
                }
                endOffset="3rem"
            >
                <Input
                    ref={inputRef}
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {}}
                    pr="3rem"
                    aria-label={label}
                    aria-autocomplete="list"
                    aria-expanded={showOptions}
                    aria-controls="typeahead-list"
                />
            </InputGroup>
            {showOptions && (
                <Box
                    position="absolute"
                    width="100%"
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                    bg="white"
                    mt={1}
                    maxH="200px"
                    overflowY="auto"
                    zIndex="dropdown"
                    boxShadow="sm"
                    id="typeahead-list"
                >
                    <ListRoot ref={listRef} gap={0}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => (
                                <ListItem
                                    key={option.id}
                                    p={2}
                                    cursor="pointer"
                                    _hover={{ bg: 'gray.100' }}
                                    bg={index === selectedIndex ? 'gray.100' : 'transparent'}
                                    onClick={() => handleOptionClick(option)}
                                    role="option"
                                    aria-selected={index === selectedIndex}
                                >
                                    {option.label}
                                </ListItem>
                            ))
                        ) : (
                            <ListItem p={2} color="gray.500">
                                No results found.
                            </ListItem>
                        )}
                    </ListRoot>
                </Box>
            )}
        </Box>
    );
}; 