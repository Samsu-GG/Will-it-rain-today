import mysql.connector


def create_connection():
    return mysql.connector.connect(
        host="localhost",  # Change if using remote DB
        user="root",  # Replace with your DB username
        password="istiack123@",  # Replace with your DB password
        database="bangladesh_locations",
    )
