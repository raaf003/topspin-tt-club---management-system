/**
 * Utility to download a specific localStorage key as a JSON file.
 * @param key The localStorage key to export
 */
export const downloadLocalStorageData = (key: string) => {
  const data = localStorage.getItem(key);
  
  if (!data) {
    console.error(`No data found in localStorage for key: ${key}`);
    return false;
  }

  try {
    // Validate that it's actually JSON
    JSON.parse(data);
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.download = `${key}_${timestamp}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
    return true;
  } catch (e) {
    console.error('Data found is not valid JSON:', e);
    return false;
  }
};
