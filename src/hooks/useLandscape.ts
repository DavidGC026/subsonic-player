import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

/**
 * Hook that detects landscape orientation on phones.
 * Returns `isLandscape: true` when window width > height.
 * Also returns current screen dimensions for layout calculations.
 */
export const useLandscape = () => {
    const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setDimensions(window);
        });
        return () => subscription?.remove();
    }, []);

    const isLandscape = dimensions.width > dimensions.height;

    return {
        isLandscape,
        screenWidth: dimensions.width,
        screenHeight: dimensions.height,
    };
};

export default useLandscape;
