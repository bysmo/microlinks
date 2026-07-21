<?php
$dir = __DIR__;

echo "Déverrouillage des fichiers (chflags -R nouchg)...\n";
system("chflags -R nouchg " . escapeshellarg($dir));

echo "Recherche et suppression des fichiers ._*...\n";
$it = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
    RecursiveIteratorIterator::SELF_FIRST
);

$count = 0;
$failed = 0;

foreach ($it as $file) {
    $filename = $file->getFilename();
    if (strpos($filename, '._') === 0) {
        $path = $file->getRealPath();
        if (strpos($path, '/.git/') === false) {
            if (@unlink($path)) {
                $count++;
            } else {
                echo "Échec de la suppression : $path\n";
                $failed++;
            }
        }
    }
}

echo "Terminé. Fichiers supprimés : $count, Échecs : $failed\n";
