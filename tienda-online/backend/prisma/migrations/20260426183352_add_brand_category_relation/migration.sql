-- CreateTable
CREATE TABLE "_CategoriaMarcas" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CategoriaMarcas_AB_unique" ON "_CategoriaMarcas"("A", "B");

-- CreateIndex
CREATE INDEX "_CategoriaMarcas_B_index" ON "_CategoriaMarcas"("B");

-- AddForeignKey
ALTER TABLE "_CategoriaMarcas" ADD CONSTRAINT "_CategoriaMarcas_A_fkey" FOREIGN KEY ("A") REFERENCES "cat_categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoriaMarcas" ADD CONSTRAINT "_CategoriaMarcas_B_fkey" FOREIGN KEY ("B") REFERENCES "cat_marcas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
