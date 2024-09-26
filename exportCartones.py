import json
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Alignment
import sys
import os
import random
from uuid import uuid4
import tempfile

# Crear directorio si no existe
def crear_directorio_si_no_existe(directorio):
    os.makedirs(directorio, exist_ok=True)

# Generación de un único cartón de bingo
def generar_carton():
    carton = [[None for _ in range(9)] for _ in range(3)]
    rango_limites = [(1, 10), (11, 20), (21, 30), (31, 40), (41, 50), (51, 60), (61, 70), (71, 80), (81, 90)]
    usados = set()

    # Asignar un número a cada columna, asegurando que haya al menos un número por columna
    for columna, (min_val, max_val) in enumerate(rango_limites):
        fila = random.randint(0, 2)
        numero = random.randint(min_val, max_val)
        while numero in usados:
            numero = random.randint(min_val, max_val)
        carton[fila][columna] = numero
        usados.add(numero)

    # Completar los números restantes para cada fila (máximo 5 números por fila)
    for fila in range(3):
        while sum(1 for num in carton[fila] if num is not None) < 5:
            columna = random.randint(0, 8)
            if carton[fila][columna] is None and len([carton[f][columna] for f in range(3) if carton[f][columna] is not None]) < 2:
                min_val, max_val = rango_limites[columna]
                numero = random.randint(min_val, max_val)
                while numero in usados:
                    numero = random.randint(min_val, max_val)
                carton[fila][columna] = numero
                usados.add(numero)

    # Ordenar los números en cada columna
    for columna in range(9):
        numeros_columna = sorted(carton[fila][columna] for fila in range(3) if carton[fila][columna] is not None)
        index = 0
        for fila in range(3):
            if carton[fila][columna] is not None:
                carton[fila][columna] = numeros_columna[index]
                index += 1

    return carton

# Función que genera cartones y guarda inmediatamente en archivos temporales
def generar_cartones_en_bloques(cantidad, bloque_size, serial, output_dir):
    todos_los_cartones = []
    bloque_numero = 1
    archivos_json = []  # Lista para rastrear archivos JSON por bloques

    for i in range(cantidad):
        carton = generar_carton()
        todos_los_cartones.append(carton)

        # Guardar cartones en bloques
        if (i + 1) % bloque_size == 0 or i + 1 == cantidad:
            archivo_json = os.path.join(output_dir, f"{serial}_cartones_bloque_{bloque_numero}.json")
            with open(archivo_json, 'w', encoding='utf-8') as f:
                json.dump(todos_los_cartones, f, indent=2)
            archivos_json.append(archivo_json)
            print(f"Guardado bloque {bloque_numero} en {archivo_json}")
            todos_los_cartones.clear()  # Limpiar la lista para liberar memoria
            bloque_numero += 1

    return archivos_json  # Retorna los archivos JSON en los que se guardaron los cartones

# Función que exporta el serial a un archivo txt
def exportar_serial_a_txt(serial, output_dir):
    archivo_txt = os.path.join(output_dir, f"{serial}_serial.txt")
    with open(archivo_txt, 'w') as file:
        file.write(serial)
    print(f"Serial exportado exitosamente a {archivo_txt}")

# Exportar a un archivo Excel usando archivos JSON generados por bloques
def exportar_a_excel_desde_archivos(archivos_json, archivo_excel):
    workbook = Workbook()
    sheet = workbook.active
    filas_exportadas = 0

    for archivo_json in archivos_json:
        with open(archivo_json, 'r', encoding='utf-8') as f:
            cartones = json.load(f)
            for carton in cartones:
                fila_carton = []
                for col_index in range(9):
                    fila_carton.append(carton[0][col_index] if carton[0][col_index] is not None else '-')
                    fila_carton.append(carton[1][col_index] if carton[1][col_index] is not None else '-')
                    fila_carton.append(carton[2][col_index] if carton[2][col_index] is not None else '-')
                sheet.append(fila_carton)
                filas_exportadas += 1

    # Alinear celdas centradas
    for row in sheet.iter_rows():
        for cell in row:
            cell.alignment = Alignment(horizontal='center', vertical='center')

    # Guardar el archivo Excel
    workbook.save(archivo_excel)
    print(f"Archivo Excel final guardado en {archivo_excel}")

# Exportar todos los cartones a un archivo JSON único final
def exportar_cartones_final(archivos_json, archivo_final_json):
    todos_los_cartones = []
    
    for archivo_json in archivos_json:
        with open(archivo_json, 'r', encoding='utf-8') as f:
            cartones = json.load(f)
            todos_los_cartones.extend(cartones)
    
    with open(archivo_final_json, 'w', encoding='utf-8') as f:
        json.dump(todos_los_cartones, f, indent=2)
    
    print(f"Archivo final de cartones guardado en {archivo_final_json}")

if __name__ == "__main__":
    # Leer argumentos
    cantidad = int(sys.argv[1])  # Cantidad total de cartones
    bloque_size = int(sys.argv[2])  # Tamaño de los bloques de guardado
    archivo_excel = sys.argv[3]  # Ruta del archivo Excel

    # Crear un serial único
    serial = str(uuid4())

    # Crear carpetas necesarias
    serial_root = os.path.join(os.path.dirname(archivo_excel), 'seriales')
    crear_directorio_si_no_existe(serial_root)
    output_dir = os.path.join(serial_root, serial)
    crear_directorio_si_no_existe(output_dir)

    # Actualizar la ruta del archivo Excel para que esté dentro de la carpeta del serial
    archivo_excel = os.path.join(output_dir, f"{serial}_cartones.xlsx")
    archivo_final_json = os.path.join(output_dir, f"{serial}_cartones_final.json")

    # Generar cartones y guardarlos en archivos JSON por bloques
    print(f"Generando {cantidad} cartones en bloques de {bloque_size}...")
    archivos_json = generar_cartones_en_bloques(cantidad, bloque_size, serial, output_dir)

    # Exportar serial a archivo txt
    exportar_serial_a_txt(serial, output_dir)

    # Exportar a Excel
    print(f"Exportando {cantidad} cartones a Excel...")
    exportar_a_excel_desde_archivos(archivos_json, archivo_excel)

    # Exportar todos los cartones a un archivo JSON final
    exportar_cartones_final(archivos_json, archivo_final_json)

    print(f"Proceso completado. Archivos generados en {output_dir}")
