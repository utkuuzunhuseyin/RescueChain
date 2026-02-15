import mysql.connector
from mysql.connector import Error

def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host='localhost',          # Cloud IP'si yerine localhost
            database='rescuechain_db',
            user='root',
            password='12345',          # İlk paylaştığın koddaki yerel şifren
            port=3306
        )
        return connection
    except Error as e:
        print(f"Veritabanı bağlantı hatası: {e}")
        return None