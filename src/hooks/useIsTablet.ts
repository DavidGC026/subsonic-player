import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

const TABLET_BREAKPOINT = 768;

export const useIsTablet = () => {
    const [isTablet, setIsTablet] = useState(() => {
        const { width, height } = Dimensions.get('window');
        return Math.min(width, height) >= TABLET_BREAKPOINT;
    });

    const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setIsTablet(Math.min(window.width, window.height) >= TABLET_BREAKPOINT);
            setScreenWidth(window.width);
        });

        return () => subscription?.remove();
    }, []);

    // Calculate responsive values
    const getColumns = (phoneColumns: number, tabletColumns: number) =>
        isTablet ? tabletColumns : phoneColumns;

    const getSize = (phoneSize: number, tabletSize: number) =>
        isTablet ? tabletSize : phoneSize;

    return { isTablet, screenWidth, getColumns, getSize };
};

export default useIsTablet;
