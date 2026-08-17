import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

export interface FilterComboboxOption {
    id: string;
    label: string;
    icon?: ReactNode;
}

export interface FilterComboboxGroup {
    heading: string;
    options: FilterComboboxOption[];
}

interface FilterComboboxProps {
    label: string;
    selectedIds: string[];
    onToggle: (id: string) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    options?: FilterComboboxOption[];
    groups?: FilterComboboxGroup[];
    wide?: boolean;
}

// Multi-select combobox styled after PokéPC's filter panel (pokepc.net/pokedex/national):
// a labeled trigger showing a summary of the current selection, opening a checkable option list.
export function FilterCombobox({
    label, selectedIds, onToggle, open, onOpenChange, options, groups, wide,
}: FilterComboboxProps) {
    const allOptions = groups ? groups.flatMap(g => g.options) : options ?? [];

    let summary = 'All';
    if (selectedIds.length === 1) {
        summary = allOptions.find(o => o.id === selectedIds[0])?.label ?? 'All';
    } else if (selectedIds.length > 1) {
        summary = `${selectedIds.length} selected`;
    }

    function renderOption(option: FilterComboboxOption) {
        const selected = selectedIds.includes(option.id);
        return (
            <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`filter-combobox__option${selected ? ' filter-combobox__option--selected' : ''}`}
                onClick={() => onToggle(option.id)}
            >
                <span className="filter-combobox__option-check">{selected && <Check size={13} strokeWidth={3} />}</span>
                {option.icon && <span className="filter-combobox__option-icon">{option.icon}</span>}
                {option.label}
            </button>
        );
    }

    return (
        <div className={`filter-combobox${wide ? ' filter-combobox--wide' : ''}`}>
            <div className="filter-combobox__label">{label}</div>
            <button
                type="button"
                className={`filter-combobox__trigger${selectedIds.length > 0 ? ' filter-combobox__trigger--active' : ''}`}
                aria-expanded={open}
                onClick={() => onOpenChange(!open)}
            >
                <span className="filter-combobox__trigger-text">{summary}</span>
                <ChevronDown size={14} />
            </button>

            {open && (
                <div className="filter-combobox__dropdown" role="listbox" aria-label={label} aria-multiselectable="true">
                    {groups
                        ? groups.map(group => (
                            <div key={group.heading} className="filter-combobox__group">
                                <div className="filter-combobox__group-heading">{group.heading}</div>
                                {group.options.map(renderOption)}
                            </div>
                        ))
                        : options?.map(renderOption)}
                </div>
            )}
        </div>
    );
}
